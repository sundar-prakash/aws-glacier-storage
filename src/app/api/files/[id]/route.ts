import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, saveMetadata, deleteS3File } from '@/lib/s3';
import type { FileMetadata } from '@/lib/s3';

// Recursive helper to find all nested descendants of a folder
function getDescendants(parentId: string, allFiles: FileMetadata[]): FileMetadata[] {
  let descendants: FileMetadata[] = [];
  const children = allFiles.filter(f => f.parentId === parentId);
  for (const child of children) {
    descendants.push(child);
    if (child.isFolder) {
      descendants = descendants.concat(getDescendants(child.id, allFiles));
    }
  }
  return descendants;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await getMetadata();
    const fileIndex = files.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return NextResponse.json({ error: 'Item not found in index.' }, { status: 404 });
    }

    const itemToDelete = files[fileIndex];
    let itemsToDelete: FileMetadata[] = [itemToDelete];

    // If it's a folder, gather all nested descendants
    if (itemToDelete.isFolder) {
      const descendants = getDescendants(itemToDelete.id, files);
      itemsToDelete = itemsToDelete.concat(descendants);
    }

    // Delete S3 assets for all physical files in the delete list
    for (const item of itemsToDelete) {
      if (!item.isFolder && item.key) {
        await deleteS3File(item.key, item.hasPreview);
      }
    }

    // Filter out the deleted items from metadata list
    const deletedIds = new Set(itemsToDelete.map(item => item.id));
    const updatedFiles = files.filter(f => !deletedIds.has(f.id));

    // Save updated index back to S3
    await saveMetadata(updatedFiles);

    return NextResponse.json({ success: true, deletedCount: itemsToDelete.length });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ 
      error: 'Failed to delete item', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, parentId } = body; // Can rename or move or both

    const files = await getMetadata();
    const itemIndex = files.findIndex(f => f.id === id);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found in index.' }, { status: 404 });
    }

    const item = files[itemIndex];

    // 1. Handle Move (parentId update)
    if (parentId !== undefined) {
      // Loop protection: Cannot move a folder into itself or any of its descendants
      if (item.isFolder) {
        if (parentId === item.id) {
          return NextResponse.json({ error: 'Cannot move a folder into itself.' }, { status: 400 });
        }

        let currentParentId = parentId;
        while (currentParentId) {
          if (currentParentId === item.id) {
            return NextResponse.json({ 
              error: 'Circular reference detected: Cannot move a folder into one of its subfolders.' 
            }, { status: 400 });
          }
          const parentItem = files.find(f => f.id === currentParentId);
          currentParentId = parentItem?.parentId || null;
        }
      }

      item.parentId = parentId || null;
      item.modifiedAt = new Date().toISOString();

      // Trigger modifiedAt update on new parent folder if it exists
      if (parentId) {
        const newParent = files.find(f => f.id === parentId);
        if (newParent) {
          newParent.modifiedAt = new Date().toISOString();
        }
      }
    }

    // 2. Handle Rename (name update)
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      item.name = name.trim();
      item.modifiedAt = new Date().toISOString();
    }

    // Save updated index back to S3
    await saveMetadata(files);

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json({ 
      error: 'Failed to update item', 
      details: error.message 
    }, { status: 500 });
  }
}
