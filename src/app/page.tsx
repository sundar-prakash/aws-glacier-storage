'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Search, 
  Grid, 
  List, 
  Plus, 
  Upload,
  FileText, 
  File, 
  Image as ImageIcon, 
  FileVideo, 
  Archive, 
  Trash2, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MoreVertical, 
  RefreshCw, 
  LogOut, 
  HelpCircle,
  Database,
  Sliders,
  FolderOpen,
  Folder,
  FolderPlus,
  ChevronRight,
  Edit,
  Move,
  DollarSign,
  Percent,
  Sun,
  Moon,
  X,
  Keyboard,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import type { FileMetadata } from '@/lib/s3';

export default function DashboardPage() {
  // Theme & Layout States
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Authentication & Configuration State
  const [s3Configured, setS3Configured] = useState<boolean | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'restoring' | 'available' | 'archived' | 'pricing'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tile'>('list');
  const [loggingOut, setLoggingOut] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Upload States
  const [uploadClass, setUploadClass] = useState<'GLACIER' | 'DEEP_ARCHIVE'>('GLACIER');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Restore Modal State
  const [restoreFile, setRestoreFile] = useState<FileMetadata | null>(null);
  const [restoreTier, setRestoreTier] = useState<'Standard' | 'Bulk'>('Bulk');
  const [restoreDays, setRestoreDays] = useState<number>(3);
  const [submittingRestore, setSubmittingRestore] = useState(false);

  // Active Context Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  // Folder Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Folder creation State
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [submittingCreateFolder, setSubmittingCreateFolder] = useState(false);

  // Move Modal State
  const [moveItem, setMoveItem] = useState<FileMetadata | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [submittingMove, setSubmittingMove] = useState(false);

  // Multi-select & Keyboard Shortcut States
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [restoreFilesList, setRestoreFilesList] = useState<FileMetadata[]>([]);

  // Rename Modal State
  const [renameItem, setRenameItem] = useState<FileMetadata | null>(null);
  const [renameName, setRenameName] = useState('');
  const [submittingRename, setSubmittingRename] = useState(false);

  // Grid / Tile Size States
  const [gridSize, setGridSize] = useState<number>(2); // 1 = Small, 2 = Medium, 3 = Large, 4 = Extra Large

  // Filter & Search files hierarchically
  const filteredFiles = files.filter(file => {
    // If we are in "all" (My Drive) and there is no search query, filter by parent directory
    if (activeTab === 'all' && !searchQuery) {
      const parentId = file.parentId || null;
      if (parentId !== currentFolderId) return false;
    }

    // Filter by tab status (globally for files only)
    if (activeTab === 'restoring') {
      if (file.isFolder || file.restoreStatus !== 'RESTORING') return false;
    }
    if (activeTab === 'available') {
      if (file.isFolder || file.restoreStatus !== 'RESTORED') return false;
    }
    if (activeTab === 'archived') {
      if (file.isFolder || file.restoreStatus !== 'ARCHIVED') return false;
    }

    // Filter files by the selected storage class context
    if (!file.isFolder && file.storageClass !== uploadClass) {
      return false;
    }

    // Apply search query globally if present
    if (searchQuery) {
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  // Sort files: Folders first, then alphabetically
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  // Load files and S3 status
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (response.ok) {
        setFiles(data.files || []);
        setS3Configured(data.s3Configured);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and load theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
    }
  };

  // Human readable sizes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeIndex = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex];
  };

  // Generate thumbnail blob from image file
  const generateThumbnailBlob = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 128;
          const MAX_HEIGHT = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/webp', 0.75);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload file workflow
  const handleUpload = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Use a local cache for folder IDs to avoid redundant API lookups/creations
    const folderPathCache: { [path: string]: string } = {};

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const uploadId = `${file.name}-${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      setUploadStatus(`Processing "${file.name}"... (${i + 1}/${selectedFiles.length})`);

      try {
        // Resolve target folder ID (recreate directory tree for folder uploads)
        let targetFolderId = currentFolderId;
        const relativePath = (file as any).webkitRelativePath; // e.g., "FolderName/SubFolder/file.txt"
        
        if (relativePath) {
          const parts = relativePath.split('/'); // ["FolderName", "SubFolder", "file.txt"]
          const folderParts = parts.slice(0, -1); // ["FolderName", "SubFolder"]
          
          let currentParentId = currentFolderId;
          let pathAccumulator = "";
          
          for (const folderName of folderParts) {
            pathAccumulator = pathAccumulator ? `${pathAccumulator}/${folderName}` : folderName;
            
            // Check cache first
            if (folderPathCache[pathAccumulator]) {
              currentParentId = folderPathCache[pathAccumulator];
            } else {
              // Check if folder already exists in S3 metadata
              let existingFolder = files.find(f => f.isFolder && f.name === folderName && f.parentId === currentParentId);
              
              if (existingFolder) {
                currentParentId = existingFolder.id;
                folderPathCache[pathAccumulator] = currentParentId as string;
              } else {
                // Create virtual folder
                setUploadStatus(`Creating folder "${folderName}"...`);
                const createRes = await fetch('/api/files', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: folderName,
                    isFolder: true,
                    parentId: currentParentId
                  }),
                });
                
                if (!createRes.ok) {
                  throw new Error(`Failed to create directory "${folderName}"`);
                }
                
                const createData = await createRes.json();
                const createdFolder = createData.file;
                
                // Add created folder locally so UI and subsequent loops can see it
                setFiles(prev => [...prev, createdFolder]);
                files.push(createdFolder); // mutate local reference to make it immediately visible to files.find
                
                currentParentId = createdFolder.id;
                folderPathCache[pathAccumulator] = currentParentId as string;
              }
            }
          }
          targetFolderId = currentParentId;
        }

        setUploadStatus(`Uploading "${file.name}"...`);

        // 1. Generate local thumbnail preview if image
        const thumbnailBlob = await generateThumbnailBlob(file);
        const hasPreview = !!thumbnailBlob;

        // 2. Register file metadata and receive presigned PUT urls
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            storageClass: uploadClass,
            hasPreview,
            parentId: targetFolderId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to initialize upload');
        }

        const { fileUploadUrl, previewUploadUrl } = await res.json();

        // 3. Upload thumbnail to S3 Standard (if generated)
        if (hasPreview && previewUploadUrl) {
          await fetch(previewUploadUrl, {
            method: 'PUT',
            body: thumbnailBlob,
          });
        }

        // 4. Upload main file directly to S3 Glacier
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', fileUploadUrl, true);
          // Set AWS S3 storage class header matching the presigned signature
          xhr.setRequestHeader('x-amz-storage-class', uploadClass);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => ({ ...prev, [uploadId]: percentage }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`S3 upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('S3 upload network error'));
          xhr.send(file);
        });

        setUploadStatus(`Successfully uploaded "${file.name}" to S3 ${uploadClass === 'DEEP_ARCHIVE' ? 'Glacier Deep Archive' : 'Glacier Flexible'}.`);
        // Clean up progress
        setTimeout(() => {
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[uploadId];
            return next;
          });
        }, 3000);

      } catch (err: any) {
        console.error(`Upload error for ${file.name}:`, err);
        setUploadStatus(`Error uploading "${file.name}": ${err.message}`);
      }
    }

    // Refresh file list
    fetchFiles();
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Sync state for single file
  const handleSyncStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}/sync`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setFiles(prev => prev.map(f => f.id === id ? data.file : f));
      }
    } catch (error) {
      console.error('Error syncing status:', error);
    }
  };

  // Sync all restoring files
  const handleSyncAll = async () => {
    const restoringFiles = files.filter(f => f.restoreStatus === 'RESTORING');
    if (restoringFiles.length === 0) return;

    setSyncingAll(true);
    try {
      await Promise.all(restoringFiles.map(f => handleSyncStatus(f.id)));
    } catch (error) {
      console.error('Error syncing all files:', error);
    } finally {
      setSyncingAll(false);
    }
  };

  // Trigger restore options
  const handleRequestRestore = async () => {
    const targets = restoreFile ? [restoreFile] : restoreFilesList;
    if (targets.length === 0) return;

    setSubmittingRestore(true);
    try {
      let succeededCount = 0;
      let failedCount = 0;
      let errorsList: string[] = [];

      for (const file of targets) {
        try {
          const res = await fetch(`/api/files/${file.id}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: restoreTier, days: restoreDays }),
          });
          const data = await res.json();
          if (res.ok) {
            setFiles(prev => prev.map(f => f.id === file.id ? data.file : f));
            succeededCount++;
          } else {
            failedCount++;
            errorsList.push(`${file.name}: ${data.error || 'Failed'}`);
          }
        } catch (err: any) {
          failedCount++;
          errorsList.push(`${file.name}: ${err.message}`);
        }
      }

      if (failedCount > 0) {
        alert(`Restore requested with some issues:\n- Succeeded: ${succeededCount}\n- Failed: ${failedCount}\n\nErrors:\n${errorsList.join('\n')}`);
      } else {
        setUploadStatus(`Successfully requested restore for ${succeededCount} file(s).`);
      }
      setRestoreFile(null);
      setRestoreFilesList([]);
    } catch (err) {
      console.error('Error initiating restore:', err);
    } finally {
      setSubmittingRestore(false);
    }
  };

  // Multi-select helper functions
  const handleItemClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    
    // Disable default browser text selection on shift+click
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.ctrlKey || e.metaKey) {
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) {
          next.delete(fileId);
        } else {
          next.add(fileId);
        }
        return next;
      });
      setLastSelectedId(fileId);
    } else if (e.shiftKey && lastSelectedId) {
      const idsList = sortedFiles.map(f => f.id);
      const startIdx = idsList.indexOf(lastSelectedId);
      const endIdx = idsList.indexOf(fileId);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        const rangeIds = idsList.slice(minIdx, maxIdx + 1);
        
        setSelectedFileIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      }
    } else {
      setSelectedFileIds(new Set([fileId]));
      setLastSelectedId(fileId);
    }
  };

  const handleItemDoubleClick = (file: FileMetadata) => {
    if (file.isFolder) {
      setCurrentFolderId(file.id);
    } else {
      if (file.restoreStatus === 'RESTORED') {
        handleDownload(file.id, file.name);
      } else {
        setRestoreFile(file);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFileIds.size === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete the ${selectedFileIds.size} selected item(s) from S3? This action cannot be undone.`);
    if (!confirmDelete) return;

    setUploadStatus(`Deleting ${selectedFileIds.size} item(s)...`);
    try {
      const idsToDelete = Array.from(selectedFileIds);
      for (const id of idsToDelete) {
        const file = files.find(f => f.id === id);
        if (!file) continue;

        const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to delete');
        }
      }
      setSelectedFileIds(new Set());
      setUploadStatus("Successfully deleted selected items.");
      fetchFiles();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting items: ${err.message}`);
      setUploadStatus(`Error deleting items: ${err.message}`);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id) && !f.isFolder);
    const restoredFiles = selectedFiles.filter(f => f.restoreStatus === 'RESTORED');
    
    if (restoredFiles.length === 0) {
      alert("No restored (available) files in selection to download.");
      return;
    }

    for (const file of restoredFiles) {
      await handleDownload(file.id, file.name);
    }
  };

  const handleRestoreSelected = () => {
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id) && !f.isFolder && f.restoreStatus === 'ARCHIVED');
    if (selectedFiles.length === 0) {
      alert("No archived files in selection to restore.");
      return;
    }
    setRestoreFilesList(selectedFiles);
    setRestoreTier('Bulk');
    setRestoreDays(7);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFileIds(new Set());
        setIsCreateFolderModalOpen(false);
        setCreateFolderName('');
        setRenameItem(null);
        setRenameName('');
        setRestoreFile(null);
        setRestoreFilesList([]);
        setMoveItem(null);
        setIsHelpOpen(false);
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedFileIds(new Set(sortedFiles.map(f => f.id)));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedFileIds.size > 0) {
          handleDeleteSelected();
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          setViewMode(prev => prev === 'list' ? 'grid' : prev === 'grid' ? 'tile' : 'list');
          return;
        }

        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          setIsCreateFolderModalOpen(true);
          return;
        }

        if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          if (selectedFileIds.size === 1) {
            const id = Array.from(selectedFileIds)[0];
            const file = files.find(f => f.id === id);
            if (file) {
              setRenameItem(file);
              setRenameName(file.name);
            }
          }
          return;
        }

        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleDownloadSelected();
          return;
        }

        if (e.key === '?' || e.key === '/') {
          e.preventDefault();
          window.open('/shortcuts', '_blank');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sortedFiles, selectedFileIds, files]);

  // Download file
  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/files/${id}/download`);
      const data = await response.json();
      if (response.ok && data.downloadUrl) {
        // Create an invisible anchor tag to trigger download
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert(data.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Delete file or folder recursively
  const handleDelete = async (item: FileMetadata) => {
    const isFolder = item.isFolder;
    const confirmMsg = isFolder
      ? `Are you sure you want to permanently delete the folder "${item.name}" and all of its contents from S3? This action cannot be undone.`
      : `Are you sure you want to permanently delete "${item.name}" from S3? This action cannot be undone.`;

    if (!confirm(confirmMsg)) return;
    
    try {
      const response = await fetch(`/api/files/${item.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchFiles();
        setUploadStatus(isFolder ? `Folder "${item.name}" and its contents deleted.` : `File "${item.name}" deleted.`);
      } else {
        const data = await response.json();
        alert(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Create virtual folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFolderName.trim()) return;

    setSubmittingCreateFolder(true);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createFolderName.trim(),
          isFolder: true,
          parentId: currentFolderId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreateFolderName('');
        setIsCreateFolderModalOpen(false);
        fetchFiles();
      } else {
        alert(data.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Create folder error:', err);
    } finally {
      setSubmittingCreateFolder(false);
    }
  };

  // Move file or folder
  const handleMoveItem = async () => {
    if (!moveItem) return;

    setSubmittingMove(true);
    try {
      const res = await fetch(`/api/files/${moveItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: moveTargetFolderId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMoveItem(null);
        setMoveTargetFolderId(null);
        fetchFiles();
      } else {
        alert(data.error || 'Failed to move item');
      }
    } catch (err) {
      console.error('Move item error:', err);
    } finally {
      setSubmittingMove(false);
    }
  };

  // Rename file or folder
  const handleRenameItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !renameName.trim()) return;

    setSubmittingRename(true);
    try {
      const res = await fetch(`/api/files/${renameItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: renameName.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRenameItem(null);
        setRenameName('');
        fetchFiles();
      } else {
        alert(data.error || 'Failed to rename item');
      }
    } catch (err) {
      console.error('Rename item error:', err);
    } finally {
      setSubmittingRename(false);
    }
  };

  // Calculate folder size recursively in JS
  const getFolderSize = (folderId: string): number => {
    return files
      .filter(f => !f.isFolder)
      .reduce((total, file) => {
        let parentId = file.parentId;
        while (parentId) {
          if (parentId === folderId) {
            return total + file.size;
          }
          const parent = files.find(f => f.id === parentId);
          parentId = parent?.parentId || null;
        }
        return total;
      }, 0);
  };

  // Check if target is a descendant of source (loop prevention check)
  const isDescendant = (parentId: string, childId: string): boolean => {
    let currentId: string | null = childId;
    while (currentId) {
      if (currentId === parentId) return true;
      const parent = files.find(f => f.id === currentId);
      currentId = parent?.parentId || null;
    }
    return false;
  };

  // Get Breadcrumbs path from Root to current active folder
  const getBreadcrumbs = () => {
    const path = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = files.find(f => f.id === currentId && f.isFolder);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    path.unshift({ id: null, name: 'My Drive' });
    return path;
  };

  // Get file type icon (including folders)
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/x-directory') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/10" />;
    }
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-sky-400" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="w-5 h-5 text-indigo-400" />;
    if (mimeType.startsWith('text/') || mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-emerald-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return <Archive className="w-5 h-5 text-amber-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };


  // Calculate storage usage
  const totalStorageSize = files.reduce((acc, f) => acc + f.size, 0);
  const FREE_TIER_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB
  const storagePercentage = Math.min((totalStorageSize / FREE_TIER_LIMIT) * 100, 100);

  const getGridColsClass = () => {
    switch (gridSize) {
      case 1: return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3';
      case 3: return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
      case 4: return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';
      case 2:
      default: return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';
    }
  };

  const getGridCardHeight = () => {
    switch (gridSize) {
      case 1: return 'h-16';
      case 3: return 'h-36';
      case 4: return 'h-48';
      case 2:
      default: return 'h-28';
    }
  };

  return (
    <div 
      className="min-h-screen bg-bg-main text-text-main flex font-sans select-none overflow-hidden relative"
      onDragEnter={handleDrag}
    >
      {/* Background gradients */}
      <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Global Drag Drop Cover Zone */}
      {dragActive && (
        <div 
          className="absolute inset-0 bg-bg-main/80 text-text-main z-50 flex items-center justify-center p-8 backdrop-blur-sm"
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-full max-w-2xl border-2 border-dashed border-blue-500/50 bg-blue-500/5 rounded-2xl p-16 flex flex-col items-center justify-center gap-4 text-center pointer-events-none animate-pulse">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Cloud className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold">Drop files here to upload</h3>
            <p className="text-[var(--text-sub)] text-sm">
              Files will be stored directly in AWS S3 Glacier storage class
            </p>
          </div>
        </div>
      )}

      {/* Sidebar mobile overlay backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* LEFT SIDEBAR */}
      <div className={`fixed md:relative top-0 bottom-0 left-0 w-64 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] backdrop-blur-md flex flex-col shrink-0 z-50 transition-transform duration-300 md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        
        {/* Sidebar Header Logo */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[var(--text-main)] tracking-wide text-sm">Glacier Drive</span>
              <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-wider uppercase">Personal Vault</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] md:hidden transition-colors cursor-pointer"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Button Section */}
        <div className="p-4 flex flex-col items-start gap-2.5 w-full">
          <div className="relative" ref={newMenuRef}>
            <button 
              onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
              className="py-3 px-6 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-150 flex items-center gap-3 text-sm shrink-0"
            >
              {/* Google Drive Multi-colored Plus SVG */}
              <svg viewBox="0 0 36 36" className="w-6 h-6 shrink-0">
                <path fill="#34A853" d="M16 16v14h4V20z" />
                <path fill="#4285F4" d="M30 16H20v4h10z" />
                <path fill="#FBBC05" d="M6 16v4h10v-4z" />
                <path fill="#EA4335" d="M20 16V6h-4v10z" />
              </svg>
              <span className="text-sm font-medium tracking-wide">New</span>
            </button>

            {/* New Button Dropdown Menu */}
            {isNewMenuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1.5 z-40 text-left">
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    setIsCreateFolderModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-amber-500" />
                  <span>New Folder</span>
                </button>
                
                <div className="border-t border-[var(--border-color)] my-1" />

                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-4 py-2.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>File Upload</span>
                </button>

                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    folderInputRef.current?.click();
                  }}
                  className="w-full px-4 py-2.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors"
                >
                  <Folder className="w-4 h-4 text-indigo-500" />
                  <span>Folder Upload</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden HTML Inputs */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            multiple
          />
          <input 
            type="file"
            ref={folderInputRef}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            multiple
            {...({ webkitdirectory: "", directory: "" } as any)}
          />
          
          {/* Storage Tier Select */}
          <div className="w-full flex items-center justify-between gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[11px] shrink-0">
             <button
              onClick={() => setUploadClass('GLACIER')}
              className={`flex-1 py-1.5 rounded text-center transition-all ${
                uploadClass === 'GLACIER' 
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="S3 Glacier Flexible Retrieval (cheapest, free Bulk or Standard retrieval)"
            >
              Glacier
            </button>
            <button
              onClick={() => setUploadClass('DEEP_ARCHIVE')}
              className={`flex-1 py-1.5 rounded text-center transition-all ${
                uploadClass === 'DEEP_ARCHIVE' 
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="S3 Glacier Deep Archive (absolute lowest cost, 12h free Bulk retrieval)"
            >
              Deep Archive
            </button>
          </div>
        </div>

        {/* Navigation Filters */}
        <div className="py-2 flex-1 space-y-0.5">
          <button 
            onClick={() => setActiveTab('all')}
            className={`w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 ${
              activeTab === 'all' 
                ? 'active-pill-bg font-medium' 
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <FolderOpen className={`w-4 h-4 ${activeTab === 'all' ? 'google-blue-icon' : ''}`} />
            <span>My Drive</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('restoring')}
            className={`w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 ${
              activeTab === 'restoring' 
                ? 'active-pill-bg font-medium' 
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'restoring' ? 'google-blue-icon' : ''}`} />
            <span>Restoring</span>
          </button>

          <button 
            onClick={() => setActiveTab('available')}
            className={`w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 ${
              activeTab === 'available' 
                ? 'active-pill-bg font-medium' 
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'available' ? 'google-blue-icon' : ''}`} />
            <span>Available</span>
          </button>

          <button 
            onClick={() => setActiveTab('archived')}
            className={`w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 ${
              activeTab === 'archived' 
                ? 'active-pill-bg font-medium' 
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Archive className={`w-4 h-4 ${activeTab === 'archived' ? 'google-blue-icon' : ''}`} />
            <span>Archived</span>
          </button>

          <button 
            onClick={() => setActiveTab('pricing')}
            className={`w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 ${
              activeTab === 'pricing' 
                ? 'active-pill-bg font-medium' 
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <DollarSign className={`w-4 h-4 ${activeTab === 'pricing' ? 'google-blue-icon' : ''}`} />
            <span>Cost Optimizer</span>
          </button>

          <Link
            href="/shortcuts"
            target="_blank"
            className="w-[92%] py-2 px-6 rounded-r-full flex items-center gap-3.5 text-sm transition-all duration-150 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
          >
            <Keyboard className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Shortcuts Help</span>
          </Link>
        </div>

        {/* Storage Usage Bar */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-sub)]">
              <Database className="w-3.5 h-3.5" />
              <span>Storage Usage</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
              <div 
                style={{ width: `${storagePercentage}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-[var(--text-muted)]">
              <span>{formatBytes(totalStorageSize)} used</span>
              <span>10 GB Free Limit</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-[var(--border-color)]/30 text-center text-[11px] text-[var(--text-muted)]">
            <span>Made with ❤️ by </span>
            <a 
              href="https://github.com/sundar-prakash" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[var(--google-blue)] hover:underline font-semibold"
            >
              sundar-prakash
            </a>
          </div>
        </div>

      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] relative z-10">
        
        {/* HEADER */}
        <header className="h-16 bg-transparent flex items-center justify-between px-4 md:px-8 shrink-0 gap-4">
          
          {/* Mobile hamburger menu & Search bar container */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] md:hidden transition-colors cursor-pointer shrink-0"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search bar */}
            <div className="w-full relative">
              <Search className="absolute left-4 top-3 w-4 h-4 text-[var(--text-muted)]" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in Glacier Drive"
                className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-hover)] border border-transparent rounded-full text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:bg-[var(--bg-card)] focus:border-[var(--border-color)] focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* User actions */}
          <div className="flex items-center gap-4">
            
            {/* Sync All button */}
            {files.some(f => f.restoreStatus === 'RESTORING') && (
              <button
                onClick={handleSyncAll}
                disabled={syncingAll}
                className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/15 disabled:opacity-50 transition-all flex items-center gap-1.5"
                title="Sync all active restoration progress"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>Sync All Statuses</span>
              </button>
            )}

            {/* Grid Size Control (Zoom Slider) */}
            {viewMode === 'grid' && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-16 h-1.5 rounded-full bg-[var(--bg-hover)] accent-blue-500 cursor-pointer"
                  title="Adjust card size"
                />
              </div>
            )}

            {/* Layout Toggle */}
            <div className="hidden sm:flex items-center gap-0.5 border border-[var(--border-color)] bg-[var(--bg-card)] p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list' ? 'bg-[var(--bg-hover)] text-[var(--text-main)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid' ? 'bg-[var(--bg-hover)] text-[var(--text-main)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('tile')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'tile' ? 'bg-[var(--bg-hover)] text-[var(--text-main)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="Tile View"
              >
                <Folder className="w-4 h-4" />
              </button>
            </div>

            {/* Help & Documentation */}
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="hidden sm:block p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:opacity-85 transition-all cursor-pointer"
              title="Help & Documentation"
            >
              <HelpCircle className="w-4 h-4 text-blue-500" />
            </button>

            {/* Keyboard Shortcuts Navigation */}
            <Link 
              href="/shortcuts"
              target="_blank"
              className="hidden sm:flex p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:opacity-85 transition-all cursor-pointer items-center justify-center"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4 text-blue-500" />
            </Link>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:opacity-85 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:opacity-85 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>

          </div>
        </header>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto m-2 sm:m-4 md:m-6 mt-0 p-3 sm:p-6 md:p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm flex flex-col min-h-0">
          
          {/* Breadcrumbs Path Navigation & Storage Class Context */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-[var(--text-sub)] bg-[var(--bg-hover)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl w-fit shadow-sm">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    <button
                      onClick={() => setCurrentFolderId(crumb.id)}
                      className={`hover:text-blue-400 transition-colors font-medium flex items-center gap-1.5 ${
                        idx === arr.length - 1 ? 'text-[var(--text-main)] font-semibold cursor-default pointer-events-none' : ''
                      }`}
                    >
                      {crumb.id === null && <Cloud className="w-4 h-4 text-blue-500" />}
                      <span>{crumb.name}</span>
                    </button>
                    {idx < arr.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              <div className={`py-1.5 px-3.5 rounded-xl text-xs font-bold border shadow-sm ${
                uploadClass === 'DEEP_ARCHIVE' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {uploadClass === 'DEEP_ARCHIVE' ? 'Deep Archive View' : 'Glacier Flexible View'}
              </div>
            </div>
          )}

          {/* S3 Configuration Banner */}
          {s3Configured === false && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-amber-400 text-sm shadow-lg shadow-amber-500/2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="space-y-1">
                <h4 className="font-semibold text-[var(--text-main)]">AWS Credentials Configuration Needed</h4>
                <p className="text-[var(--text-sub)]">
                  Your AWS access key and bucket name are not configured yet. 
                  Please update the <code className="text-[var(--text-main)] bg-black/30 px-1 py-0.5 rounded">.env.local</code> file in your workspace with your S3 details to enable uploads and restores.
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress Status Overlay */}
          {(uploadStatus || Object.keys(uploadProgress).length > 0) && (
            <div className="mb-6 p-4 rounded-xl bg-blue-600/5 border border-blue-500/10 text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[var(--text-sub)]">Active Task</span>
                <span className="font-semibold text-blue-400 text-xs">{uploadStatus}</span>
              </div>
              {Object.entries(uploadProgress).map(([key, progress]) => (
                <div key={key} className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-[11px] text-[var(--text-sub)]">
                    <span className="truncate max-w-[250px]">{key.split('-')[0]}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div style={{ width: `${progress}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-150" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-[var(--text-sub)] text-sm">Loading files...</span>
            </div>
          ) : activeTab === 'pricing' ? (
            <PricingOptimizerView />
          ) : sortedFiles.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-sidebar)]/20 p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-muted)]">
                <Cloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No files found</h3>
                <p className="text-[var(--text-sub)] text-sm max-w-sm">
                  {searchQuery 
                    ? `No matches for "${searchQuery}" in this view.`
                    : 'Drag & drop a file here, or use the sidebar buttons to create folders and upload files.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* LIST VIEW */}
              {viewMode === 'list' && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 backdrop-blur-md shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/60 text-xs font-semibold text-[var(--text-sub)] tracking-wider uppercase">
                        <th className="py-4 px-6 rounded-tl-xl">Name</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 hidden md:table-cell">Storage Class</th>
                        <th className="py-4 px-6 hidden sm:table-cell">Size</th>
                        <th className="py-4 px-6 hidden lg:table-cell">Date Modified</th>
                        <th className="py-4 px-6 text-right rounded-tr-xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {sortedFiles.map((file) => {
                        const isSelected = selectedFileIds.has(file.id);
                        return (
                          <tr 
                            key={file.id} 
                            onClick={(e) => handleItemClick(e, file.id)}
                            onDoubleClick={() => handleItemDoubleClick(file)}
                            className={`hover:bg-[var(--bg-hover)] transition-colors group cursor-pointer ${
                              isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : ''
                            }`}
                          >
                            {/* File Name & Preview */}
                            <td className="py-4 px-6 font-medium text-[var(--text-main)]">
                              <div className="flex items-center gap-3">
                                {file.hasPreview ? (
                                  <div className="w-10 h-10 rounded bg-[var(--bg-card)] overflow-hidden flex items-center justify-center border border-[var(--border-color)] relative shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                      src={`/api/files/${file.id}/preview`} 
                                      alt={file.name} 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => {
                                        // Fallback if preview fails
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-color)] shrink-0">
                                    {getFileIcon(file.mimeType)}
                                  </div>
                                )}
                                <span 
                                  className={`truncate max-w-[200px] sm:max-w-[300px] block ${file.isFolder ? 'hover:text-blue-400 hover:underline font-semibold' : ''}`} 
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-4 px-6">
                              {file.isFolder ? (
                                <span className="text-[var(--text-muted)] font-medium text-xs">—</span>
                              ) : (
                                <>
                                  {file.restoreStatus === 'ARCHIVED' && (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-500/10 text-[var(--text-sub)] border border-gray-500/20">
                                      <Archive className="w-3 h-3" />
                                      <span>Archived</span>
                                    </span>
                                  )}
                                  {file.restoreStatus === 'RESTORING' && (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>Restoring ({file.restoreTier})</span>
                                    </span>
                                  )}
                                  {file.restoreStatus === 'RESTORED' && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Available</span>
                                      </span>
                                      {file.restoredUntil && (
                                        <span className="text-[10px] text-[var(--text-muted)] pl-1">
                                          Expires: {new Date(file.restoredUntil).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </td>

                            {/* Storage Class */}
                            <td className="py-4 px-6 text-xs text-[var(--text-sub)] font-mono hidden md:table-cell">
                              {file.isFolder ? (
                                <span className="text-amber-500/70 font-semibold">Folder</span>
                              ) : (
                                file.storageClass === 'DEEP_ARCHIVE' ? 'Deep Archive' : 'Glacier Flexible'
                              )}
                            </td>

                            {/* Size */}
                            <td className="py-4 px-6 text-sm text-[var(--text-main)] hidden sm:table-cell">
                              {file.isFolder ? formatBytes(getFolderSize(file.id)) : formatBytes(file.size)}
                            </td>

                            {/* Date Modified */}
                            <td className="py-4 px-6 text-sm text-[var(--text-sub)] hidden lg:table-cell">
                              {new Date(file.modifiedAt || file.uploadedAt).toLocaleDateString()}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-right relative">
                              <div className="flex items-center justify-end gap-2">
                                {/* Primary action based on state */}
                                {file.isFolder ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentFolderId(file.id);
                                    }}
                                    className="py-1.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-all text-xs font-semibold"
                                  >
                                    Open
                                  </button>
                                ) : (
                                  <>
                                    {file.restoreStatus === 'ARCHIVED' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRestoreFile(file);
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-semibold"
                                      >
                                        Restore
                                      </button>
                                    )}
                                    {file.restoreStatus === 'RESTORING' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSyncStatus(file.id);
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Check</span>
                                      </button>
                                    )}
                                    {file.restoreStatus === 'RESTORED' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(file.id, file.name);
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* More action menu */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === file.id ? null : file.id);
                                    }}
                                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  
                                  {activeMenuId === file.id && (
                                    <div 
                                      ref={menuRef}
                                      className="absolute right-0 mt-2 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 z-30 text-left"
                                    >
                                      {file.restoreStatus === 'RESTORED' && !file.isFolder && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            handleDownload(file.id, file.name);
                                          }}
                                          className="w-full px-4 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          <span>Download</span>
                                        </button>
                                      )}
                                      {file.restoreStatus === 'ARCHIVED' && !file.isFolder && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            setRestoreFile(file);
                                          }}
                                          className="w-full px-4 py-2 text-xs text-blue-400 hover:bg-blue-500/10 flex items-center gap-2"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>Restore</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          setRenameItem(file);
                                          setRenameName(file.name);
                                        }}
                                        className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                      >
                                        <Edit className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                        <span>Rename</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          setMoveItem(file);
                                          setMoveTargetFolderId(null);
                                        }}
                                        className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                      >
                                        <Move className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                        <span>Move to...</span>
                                      </button>
                                      <div className="border-t border-[var(--border-color)] my-1" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          handleDelete(file);
                                        }}
                                        className="w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className={getGridColsClass()}>
                  {sortedFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div 
                        key={file.id} 
                        onClick={(e) => handleItemClick(e, file.id)}
                        onDoubleClick={() => handleItemDoubleClick(file)}
                        className={`group bg-[var(--bg-sidebar)]/30 border rounded-xl overflow-hidden shadow-lg hover:border-[var(--text-sub)]/30 transition-all duration-300 flex flex-col cursor-pointer ${
                          isSelected ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30' : 'border-[var(--border-color)]'
                        }`}
                      >
                        {/* Image Preview / File Icon Panel */}
                        <div className={`${getGridCardHeight()} bg-[var(--bg-card)]/80 flex items-center justify-center relative border-b border-[var(--border-color)]`}>
                          {file.isFolder ? (
                             <div className="w-16 h-16 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                               <Folder className="w-8 h-8 text-amber-500 fill-amber-500/10" />
                             </div>
                          ) : file.hasPreview && gridSize > 1 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={`/api/files/${file.id}/preview`} 
                              alt={file.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-color)] flex items-center justify-center">
                              {getFileIcon(file.mimeType)}
                            </div>
                          )}
                          
                          {/* Status Badge floating */}
                          {!file.isFolder && (
                            <div className="absolute top-3 left-3">
                              {file.restoreStatus === 'ARCHIVED' && (
                                <span className="py-0.5 px-2 rounded-full text-[10px] font-medium bg-gray-500/15 text-[var(--text-sub)] border border-gray-500/20 backdrop-blur-sm">
                                  Archived
                                </span>
                              )}
                              {file.restoreStatus === 'RESTORING' && (
                                <span className="py-0.5 px-2 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20 backdrop-blur-sm animate-pulse">
                                  Restoring
                                </span>
                              )}
                              {file.restoreStatus === 'RESTORED' && (
                                <span className="py-0.5 px-2 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm">
                                  Available
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info Panel */}
                        <div className="p-4 flex flex-col gap-1.5 flex-1 justify-between">
                          <div className="min-w-0">
                            <h4 
                              className={`text-sm font-semibold text-[var(--text-main)] truncate ${file.isFolder ? 'group-hover:text-blue-400' : ''}`} 
                              title={file.name}
                            >
                              {file.name}
                            </h4>
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              {file.isFolder ? 'Directory Folder' : (file.storageClass === 'DEEP_ARCHIVE' ? 'Deep Archive' : 'Flexible Glacier')}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-[var(--border-color)]">
                            <span className="text-xs text-[var(--text-sub)]">
                              {file.isFolder ? formatBytes(getFolderSize(file.id)) : formatBytes(file.size)}
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Action shortcuts */}
                              {file.isFolder ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentFolderId(file.id);
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-[10px] font-bold transition-all"
                                >
                                  Open
                                </button>
                              ) : (
                                <>
                                  {file.restoreStatus === 'ARCHIVED' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRestoreFile(file);
                                      }}
                                      className="py-1 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-[10px] font-bold"
                                    >
                                      Restore
                                    </button>
                                  )}
                                  {file.restoreStatus === 'RESTORING' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSyncStatus(file.id);
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                                      title="Check status"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </button>
                                  )}
                                  {file.restoreStatus === 'RESTORED' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(file.id, file.name);
                                      }}
                                      className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                      title="Download File"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}

                              {/* 3-dot Menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === file.id ? null : file.id);
                                  }}
                                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                
                                {activeMenuId === file.id && (
                                  <div 
                                    ref={menuRef}
                                    className="absolute right-0 bottom-full mb-1 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 z-30 text-left"
                                  >
                                    {file.restoreStatus === 'RESTORED' && !file.isFolder && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          handleDownload(file.id, file.name);
                                        }}
                                        className="w-full px-4 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        setRenameItem(file);
                                        setRenameName(file.name);
                                      }}
                                      className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                      <span>Rename</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        setMoveItem(file);
                                        setMoveTargetFolderId(null);
                                      }}
                                      className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                    >
                                      <Move className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                      <span>Move to...</span>
                                    </button>
                                    <div className="border-t border-[var(--border-color)] my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleDelete(file);
                                      }}
                                      className="w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TILE VIEW (COMPACT) */}
              {viewMode === 'tile' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 animate-fadeIn">
                  {sortedFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div 
                        key={file.id}
                        onClick={(e) => handleItemClick(e, file.id)}
                        onDoubleClick={() => handleItemDoubleClick(file)}
                        className={`group border hover:border-[var(--text-sub)]/30 rounded-xl p-3 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer ${
                          isSelected ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30' : 'bg-[var(--bg-sidebar)]/30 border-[var(--border-color)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[var(--bg-card)] flex items-center justify-center shrink-0 border border-[var(--border-color)] group-hover:scale-105 transition-transform">
                            {getFileIcon(file.mimeType)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-semibold text-[var(--text-main)] truncate pr-1 ${file.isFolder ? 'group-hover:text-blue-400' : ''}`} title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-medium font-mono">
                              {file.isFolder ? formatBytes(getFolderSize(file.id)) : formatBytes(file.size)}
                            </span>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === file.id ? null : file.id);
                            }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          
                          {activeMenuId === file.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 mt-2 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 z-30 text-left"
                            >
                              {file.isFolder ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setCurrentFolderId(file.id);
                                  }}
                                  className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  <span>Open Folder</span>
                                </button>
                              ) : (
                                <>
                                  {file.restoreStatus === 'RESTORED' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleDownload(file.id, file.name);
                                      }}
                                      className="w-full px-4 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </button>
                                  )}
                                  {file.restoreStatus === 'ARCHIVED' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        setRestoreFile(file);
                                      }}
                                      className="w-full px-4 py-2 text-xs text-blue-400 hover:bg-blue-500/10 flex items-center gap-2"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>Restore</span>
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  setRenameItem(file);
                                  setRenameName(file.name);
                                }}
                                className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  setMoveItem(file);
                                  setMoveTargetFolderId(null);
                                }}
                                className="w-full px-4 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                              >
                                <Move className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <span>Move to...</span>
                              </button>
                              <div className="border-t border-[var(--border-color)] my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleDelete(file);
                                }}
                                className="w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* RESTORE DIALOG MODAL */}
      {(restoreFile || restoreFilesList.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Request S3 Glacier Restore</h3>
            <p className="text-xs text-[var(--text-sub)] mb-6">
              Requesting access for:{' '}
              <span className="text-[var(--text-main)] font-semibold">
                {restoreFile ? restoreFile.name : `${restoreFilesList.length} selected files`}
              </span>
            </p>

            <div className="space-y-5">
              {/* Option 1: Retrieval Tiers */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider block">
                  Retrieval Option (Free Tiers)
                </label>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* Bulk Retrieval (Recommended) */}
                  <label className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    restoreTier === 'Bulk'
                      ? 'bg-blue-600/5 border-blue-500/50'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="restoreTier" 
                          value="Bulk" 
                          checked={restoreTier === 'Bulk'} 
                          onChange={() => setRestoreTier('Bulk')}
                          className="text-blue-500 focus:ring-0 focus:ring-offset-0 bg-transparent"
                        />
                        Bulk Retrieval
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        Always Free
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-sub)] pl-5">
                      Completes in **5 - 12 hours**. Ideal for larger datasets. 100% free of AWS retrieval fees.
                    </p>
                  </label>

                  {/* Standard Retrieval (Capped) */}
                  <label className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    restoreTier === 'Standard'
                      ? 'bg-blue-600/5 border-blue-500/50'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="restoreTier" 
                          value="Standard" 
                          checked={restoreTier === 'Standard'} 
                          onChange={() => setRestoreTier('Standard')}
                          className="text-blue-500 focus:ring-0 focus:ring-offset-0 bg-transparent"
                        />
                        Standard Retrieval
                      </span>
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                        Capped (10GB/mo)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-sub)] pl-5">
                      Completes in **3 - 5 hours** (faster). Free up to 10 GB per month under AWS Free Tier.
                    </p>
                  </label>
                </div>
              </div>

              {/* Option 2: Expiry Duration */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider block">
                  Temporary Availability Duration
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min={1} 
                    max={30} 
                    value={restoreDays}
                    onChange={(e) => setRestoreDays(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-sm font-bold text-[var(--text-main)] min-w-[50px] text-right">
                    {restoreDays} {restoreDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  The restored copy will automatically be deleted from S3 Standard storage after this period.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)] mt-6">
                <button
                  onClick={() => {
                    setRestoreFile(null);
                    setRestoreFilesList([]);
                  }}
                  disabled={submittingRestore}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-sub)] font-semibold text-sm hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestRestore}
                  disabled={submittingRestore}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submittingRestore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Requesting...</span>
                    </>
                  ) : (
                    <span>Initiate Restore</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-500" />
              <span>Create New Folder</span>
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={createFolderName}
                onChange={(e) => setCreateFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                required
                autoFocus
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateFolderModalOpen(false);
                    setCreateFolderName('');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreateFolder}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
                >
                  {submittingCreateFolder ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <Edit className="w-4 h-4 text-blue-500" />
              <span>Rename {renameItem.isFolder ? 'Folder' : 'File'}</span>
            </h3>
            <form onSubmit={handleRenameItem} className="space-y-4">
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="New name"
                className="w-full px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                required
                autoFocus
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenameItem(null);
                    setRenameName('');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRename}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
                >
                  {submittingRename ? 'Saving...' : 'Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVE MODAL (FOLDER PICKER) */}
      {moveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
              <Move className="w-5 h-5 text-indigo-400" />
              <span>Move Item</span>
            </h3>
            <p className="text-xs text-[var(--text-sub)] mb-4">
              Choose a folder destination for: <span className="text-[var(--text-main)] font-semibold">{moveItem.name}</span>
            </p>

            {/* Navigation path inside modal */}
            <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs overflow-x-auto">
              <button
                onClick={() => setMoveTargetFolderId(null)}
                className={`hover:text-blue-400 transition-colors ${moveTargetFolderId === null ? 'text-blue-400 font-semibold' : 'text-[var(--text-sub)]'}`}
              >
                My Drive
              </button>
              {(() => {
                const path = [];
                let currentId = moveTargetFolderId;
                while (currentId) {
                  const folder = files.find(f => f.id === currentId && f.isFolder);
                  if (folder) {
                    path.unshift(folder);
                    currentId = folder.parentId || null;
                  } else break;
                }
                return path.map(folder => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    <button
                      onClick={() => setMoveTargetFolderId(folder.id)}
                      className={`hover:text-blue-400 transition-colors ${moveTargetFolderId === folder.id ? 'text-blue-400 font-semibold' : 'text-[var(--text-sub)]'}`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ));
              })()}
            </div>

            {/* Subfolders list inside modal */}
            <div className="h-48 border border-[var(--border-color)] rounded-xl overflow-y-auto bg-[var(--bg-sidebar)]/50 p-2 divide-y divide-[var(--border-color)]/20 mb-6">
              {/* If not at root, show Go Back option */}
              {moveTargetFolderId !== null && (
                <button
                  onClick={() => {
                    const current = files.find(f => f.id === moveTargetFolderId);
                    setMoveTargetFolderId(current?.parentId || null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-[var(--bg-hover)] flex items-center gap-2 rounded-lg"
                >
                  <Folder className="w-4 h-4 shrink-0" />
                  <span>.. (Up one level)</span>
                </button>
              )}

              {(() => {
                // Show folders at current level, excluding the folder being moved and its descendants to prevent loops
                const subfolders = files.filter(f => 
                  f.isFolder && 
                  (f.parentId || null) === moveTargetFolderId && 
                  f.id !== moveItem.id && 
                  !isDescendant(moveItem.id, f.id)
                );

                if (subfolders.length === 0) {
                  return (
                    <div className="h-32 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs">
                      <span>No eligible subfolders found here</span>
                    </div>
                  );
                }

                return subfolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setMoveTargetFolderId(folder.id)}
                    className="w-full text-left px-3 py-2.5 text-xs text-[var(--text-sub)] hover:bg-[var(--bg-hover)] flex items-center justify-between rounded-lg group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500/10" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ));
              })()}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setMoveItem(null);
                  setMoveTargetFolderId(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveItem}
                disabled={submittingMove}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {submittingMove ? 'Moving...' : 'Move Here'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & DOCUMENTATION MODAL */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
              <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span>Glacier Vault Help & Documentation</span>
              </h3>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="p-1 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 text-sm text-[var(--text-sub)]">
              {/* S3 Glacier Lifecycle Section */}
              <section className="space-y-2">
                <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>S3 Glacier File Lifecycle</span>
                </h4>
                <p className="leading-relaxed">
                  AWS S3 Glacier is an archive storage class designed for secure, low-cost long-term data backup. In order to download any archived file, it must pass through three distinct stages:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Step 1</span>
                    <h5 className="font-bold text-gray-300">Archived (Frozen)</h5>
                    <p className="text-xs text-[var(--text-muted)]">
                      The file is compressed and stored in Glacier. It is safe, but cannot be downloaded immediately.
                    </p>
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Step 2</span>
                    <h5 className="font-bold text-amber-300">Restoring (Thawing)</h5>
                    <p className="text-xs text-[var(--text-muted)]">
                      S3 is thawing the file from the tape archives. This takes 5 to 12 hours for Bulk retrievals.
                    </p>
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Step 3</span>
                    <h5 className="font-bold text-emerald-300">Available (Active)</h5>
                    <p className="text-xs text-[var(--text-muted)]">
                      The file is ready! You can download it directly. It will re-freeze back to Archived after a few days.
                    </p>
                  </div>
                </div>
              </section>

              {/* Retrieval Tiers Section */}
              <section className="space-y-2">
                <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>Retrieval Speed Options</span>
                </h4>
                <p className="leading-relaxed">
                  When you initiate a restore, you can choose between two retrieval speeds depending on how quickly you need your data:
                </p>
                <ul className="list-disc pl-5 space-y-2 pt-1">
                  <li>
                    <strong className="text-[var(--text-main)]">Bulk Retrieval (Recommended):</strong> Takes 5 to 12 hours. It is 100% free of data-retrieval fees on S3. Great for non-urgent backups.
                  </li>
                  <li>
                    <strong className="text-[var(--text-main)]">Standard Retrieval:</strong> Takes 3 to 5 hours. It is extremely cheap ($0.01 per GB retrieved). Good if you need files sooner.
                  </li>
                </ul>
              </section>

              {/* Cost Optimization Section */}
              <section className="space-y-2">
                <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Cost Optimization Tips</span>
                </h4>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-400">
                  <p className="font-semibold text-xs uppercase tracking-wider">How to use Glacier almost FREE:</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--text-sub)]">
                    <li>Always choose <strong className="text-[var(--text-main)]">Bulk Retrieval</strong> when restoring files. S3 doesn't charge any retrieval fee for Bulk requests.</li>
                    <li>Store files in the <strong className="text-[var(--text-main)]">Glacier Deep Archive</strong> tier ($0.00099/GB/mo) for the absolute lowest pricing if you backup files you rarely access.</li>
                    <li>Avoid frequent uploads/deletions of small files (S3 charges request fees per 1,000 requests). Try to group files in zip archives before uploading.</li>
                  </ul>
                </div>
              </section>

              {/* FAQ Section */}
              <section className="space-y-2">
                <h4 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Frequently Asked Questions</span>
                </h4>
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <h5 className="font-semibold text-[var(--text-main)]">Do I need to pay for storage and retrieval separately?</h5>
                    <p className="text-xs leading-relaxed text-[var(--text-sub)]">
                      Yes. S3 charges a monthly rate for storing your bytes (e.g. $0.0036/GB/mo for Glacier). Retrieval is charged separately when you request standard restores, but is entirely free if you select Bulk retrieves.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-semibold text-[var(--text-main)]">What happens when the restore availability days expire?</h5>
                    <p className="text-xs leading-relaxed text-[var(--text-sub)]">
                      The file returns to the "Archived" (frozen) state to avoid incurring S3 Standard storage costs. You can restore it again anytime.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <Link 
                href="/shortcuts"
                target="_blank"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all"
              >
                <Keyboard className="w-4 h-4 text-blue-500" />
                <span>Keyboard Shortcuts Docs</span>
              </Link>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-md hover:shadow-blue-600/25"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR FOR MULTI-SELECT */}
      {selectedFileIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-card)] border border-[var(--border-color)] px-5 py-3 rounded-full shadow-2xl flex items-center gap-5 backdrop-blur-lg animate-slideUp transition-all duration-300">
          <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-4">
            <button 
              onClick={() => setSelectedFileIds(new Set())}
              className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[var(--text-main)] whitespace-nowrap">
              {selectedFileIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSelected}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
              title="Download selected restored files"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handleRestoreSelected}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
              title="Restore selected archived files"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
              title="Delete selected files/folders"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function PricingOptimizerView() {
  const [storageGB, setStorageGB] = useState<number>(100);
  const [storageType, setStorageType] = useState<'STANDARD' | 'GLACIER' | 'DEEP_ARCHIVE'>('DEEP_ARCHIVE');
  const [retrievalTier, setRetrievalTier] = useState<'Bulk' | 'Standard' | 'Expedited'>('Bulk');
  const [retrievalGB, setRetrievalGB] = useState<number>(10);

  // Constants based on AWS Region ap-south-1 (Mumbai)
  const prices = {
    STANDARD: 0.023,       // $0.023 / GB
    GLACIER: 0.0036,      // $0.0036 / GB (Flexible Retrieval)
    DEEP_ARCHIVE: 0.00099 // $0.00099 / GB
  };

  const retrievalStoragePrices = {
    Bulk: 0,
    Standard: 0.011,      // $0.011 / GB
    Expedited: 0.033      // $0.033 / GB
  };

  const retrievalRequestPrices = {
    Bulk: 0.0275,         // per 1000 requests
    Standard: 0.055,      // per 1000 requests
    Expedited: 11.0       // per 1000 requests
  };

  // Calculations
  const storageCost = storageGB * prices[storageType];
  const isStorageFree = storageType === 'STANDARD' && storageGB <= 5;
  const storageCostFinal = isStorageFree ? 0 : storageCost;

  let retrievalCost = 0;
  if (retrievalTier === 'Standard') {
    const billableGB = Math.max(0, retrievalGB - 10); // 10 GB free Standard retrieval monthly
    retrievalCost = billableGB * retrievalStoragePrices.Standard;
  } else if (retrievalTier === 'Expedited') {
    retrievalCost = retrievalGB * retrievalStoragePrices.Expedited;
  } // Bulk retrieval has 0 data retrieval cost

  // Approximate retrieval request fee (assume 1 request per GB average for calculations)
  const requestCount = Math.ceil(retrievalGB / 2); // Assume average size is 2GB per file
  const requestCost = (requestCount / 1000) * retrievalRequestPrices[retrievalTier];

  const totalMonthlyCost = storageCostFinal + retrievalCost + requestCost;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 backdrop-blur-md shadow-xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <span>AWS Glacier Cost Optimizer & Blueprint</span>
          </h2>
          <p className="text-sm text-[var(--text-sub)] max-w-2xl">
            Simulate your storage and retrieval needs to see how AWS S3 Glacier can backup Terabytes of personal data virtually for free. 
            Follow the blueprint to minimize or eliminate AWS fees.
          </p>
        </div>
        <div className="py-2 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active Mumbai Plan (ap-south-1)</span>
        </div>
      </div>

      {/* Grid: Inputs vs Estimates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUTS COLUMN */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Storage Config */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 backdrop-blur-md shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>1. Storage Size & Class</span>
            </h3>

            {/* Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-sub)]">
                <span>Total Data Volume</span>
                <span className="text-blue-400 text-sm font-bold">{storageGB >= 1000 ? `${(storageGB / 1000).toFixed(1)} TB` : `${storageGB} GB`}</span>
              </div>
              <input 
                type="range"
                min={5}
                max={5000}
                step={5}
                value={storageGB}
                onChange={(e) => setStorageGB(Number(e.target.value))}
                className="w-full accent-blue-500 bg-[var(--bg-hover)] h-2 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>5 GB</span>
                <span>1 TB</span>
                <span>3 TB</span>
                <span>5 TB</span>
              </div>
            </div>

            {/* Storage Class Choice */}
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-sub)] block font-medium">Select S3 Storage Tier</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setStorageType('STANDARD')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    storageType === 'STANDARD'
                      ? 'bg-blue-600/5 border-blue-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="text-xs font-bold text-[var(--text-main)]">S3 Standard</span>
                  <span className="text-[10px] text-[var(--text-muted)]">$0.023 / GB / mo</span>
                  <span className="text-[10px] text-blue-400 mt-1 font-semibold">Free up to 5 GB</span>
                </button>

                <button
                  onClick={() => setStorageType('GLACIER')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    storageType === 'GLACIER'
                      ? 'bg-blue-600/5 border-blue-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="text-xs font-bold text-[var(--text-main)]">Glacier Flexible</span>
                  <span className="text-[10px] text-[var(--text-muted)]">$0.0036 / GB / mo</span>
                  <span className="text-[10px] text-[var(--text-sub)] mt-1">90d min duration</span>
                </button>

                <button
                  onClick={() => setStorageType('DEEP_ARCHIVE')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    storageType === 'DEEP_ARCHIVE'
                      ? 'bg-blue-600/5 border-blue-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="text-xs font-bold text-[var(--text-main)]">Glacier Deep Archive</span>
                  <span className="text-[10px] text-[var(--text-muted)]">$0.00099 / GB / mo</span>
                  <span className="text-[10px] text-emerald-400 mt-1 font-semibold">Lowest storage cost</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Retrieval Config */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 backdrop-blur-md shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>2. Retrieval Requirements</span>
            </h3>

            {/* Retrieval Tier choice */}
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-sub)] block font-medium">Retrieval Speed / Option</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setRetrievalTier('Bulk')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    retrievalTier === 'Bulk'
                      ? 'bg-indigo-600/5 border-indigo-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-[var(--text-main)]">Bulk Retrieval</span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Free</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">5 - 12 hours waiting</span>
                  <span className="text-[10px] text-[var(--text-sub)] mt-1">AWS Fee: **$0.00**</span>
                </button>

                <button
                  onClick={() => setRetrievalTier('Standard')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    retrievalTier === 'Standard'
                      ? 'bg-indigo-600/5 border-indigo-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-[var(--text-main)]">Standard Retrieval</span>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Capped Free</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">3 - 5 hours waiting</span>
                  <span className="text-[10px] text-[var(--text-sub)] mt-1">Free up to 10GB/mo</span>
                </button>

                <button
                  onClick={() => setRetrievalTier('Expedited')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    retrievalTier === 'Expedited'
                      ? 'bg-indigo-600/5 border-indigo-500/50'
                      : 'bg-[var(--bg-card)]/40 border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-[var(--text-main)]">Expedited</span>
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Expensive</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">1 - 5 minutes instant</span>
                  <span className="text-[10px] text-[var(--text-sub)] mt-1">Cost: $0.033 / GB</span>
                </button>
              </div>
            </div>

            {/* Retrieval Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-sub)]">
                <span>Estimated Monthly Data Restored</span>
                <span className="text-indigo-400 text-sm font-bold">{retrievalGB} GB</span>
              </div>
              <input 
                type="range"
                min={0}
                max={Math.min(storageGB, 200)}
                step={2}
                value={retrievalGB}
                disabled={storageType === 'STANDARD'}
                onChange={(e) => setRetrievalGB(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-[var(--bg-hover)] h-2 rounded-full cursor-pointer disabled:opacity-30"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>0 GB</span>
                <span>100 GB</span>
                <span>200 GB</span>
              </div>
            </div>
          </div>

        </div>

        {/* PROJECTED BILL ESTIMATE COLUMN */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-card)]/80 to-[var(--bg-main)]/80 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col justify-between h-full group hover:border-[var(--text-sub)]/30 transition-colors">
            
            {/* Glow Decorator */}
            <div className="absolute -right-12 -top-12 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/15 transition-all" />

            <div className="space-y-6 relative z-10">
              <h3 className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider">
                Monthly Spend Forecast
              </h3>

              {/* Huge Price Display */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1 text-[var(--text-main)]">
                  <span className="text-4xl font-black font-sans tracking-tight">
                    ${totalMonthlyCost.toFixed(2)}
                  </span>
                  <span className="text-sm text-[var(--text-sub)] font-medium">/ month</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Approximate AWS billing invoice (Mumbai region rates, excl. taxes).
                </p>
              </div>

              {/* Itemized list */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-color)] text-xs">
                
                {/* Storage Cost Line */}
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Storage Fee ({storageGB} GB)</span>
                  <div className="flex items-center gap-1.5">
                    {isStorageFree && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Free Tier</span>
                    )}
                    <span className="font-semibold text-[var(--text-main)]">${storageCostFinal.toFixed(4)}</span>
                  </div>
                </div>

                {/* Data Retrieval Line */}
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Retrieval Data Fee ({retrievalGB} GB)</span>
                  <div className="flex items-center gap-1.5">
                    {retrievalTier === 'Bulk' && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Always Free</span>
                    )}
                    {retrievalTier === 'Standard' && retrievalGB <= 10 && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Free Tier</span>
                    )}
                    <span className="font-semibold text-[var(--text-main)]">${retrievalCost.toFixed(4)}</span>
                  </div>
                </div>

                {/* API Request Line */}
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">API Requests Fee (Est.)</span>
                  <div className="flex items-center gap-1.5">
                    {requestCost === 0 && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Free Allowance</span>
                    )}
                    <span className="font-semibold text-[var(--text-main)]">${requestCost.toFixed(4)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Zero Cost validation indicator */}
            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-400 leading-relaxed relative z-10">
              {totalMonthlyCost === 0 ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-400 block mb-0.5">100% Free Plan Active</span>
                    This configuration utilizes S3 Standard Free Tier or AWS Glacier Bulk retrievals, meaning your net cost is **$0.00**!
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-400 block mb-0.5">Priced Configuration</span>
                    A small monthly fee is expected. Select **Glacier Deep Archive** and **Bulk Retrieval** to bring this estimate down to **$0.00**.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* COMPREHENSIVE EFFICIENCY BLUEPRINT */}
      <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 backdrop-blur-md shadow-xl space-y-6">
        <h3 className="text-md font-bold text-[var(--text-main)] flex items-center gap-2">
          <Percent className="w-5 h-5 text-emerald-400" />
          <span>Zero-Cost Storage & Retrieval Blueprint</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="p-5 rounded-xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] space-y-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              1. The Bulk Retrieve Secret ($0.00 Retrievals)
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              When restoring files archived in Glacier, AWS charges standard and expedited speeds by the Gigabyte. However, **Bulk Retrieval is 100% free** under AWS pricing guidelines. 
              Bulk retrieval takes 5 to 12 hours to deliver, which is perfect for non-instant personal file storage backups. Always choose **Bulk** when initiating a restore to bypass all retrieval fees.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] space-y-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              2. 10 GB/Mo Standard Free Quota
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              AWS Free Tier includes up to **10 GB per month of free Standard Retrievals** from S3 Glacier. 
              If you require a file in 3-5 hours (faster than Bulk), you can use Standard Retrieval without charges, provided your cumulative restorations stay under 10 GB in the current billing cycle.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] space-y-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              3. Thumbnail Storage Management
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              To support folders and visual file lists, this drive generates WebP thumbnails client-side inside your browser and saves them under S3 Standard. 
              Because average thumbnails are tiny (under 10KB), you can upload **over 500,000 files** and still remain within the **5 GB free monthly S3 Standard tier**.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] space-y-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              4. Watch Out For Minimum Storage Durations
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              AWS Glacier Flexible carries a **90-day minimum storage period**, and Glacier Deep Archive carries a **180-day minimum**. 
              If you upload a file and delete it after 10 days, AWS will charge a prorated fee for the remaining days. 
              **Rule of thumb:** Only upload files to Glacier that you plan to archive long-term (3+ months).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-card)]/40 border border-[var(--border-color)] space-y-2 md:col-span-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              5. Virtual Folders Cause Zero Extra Operations
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              Unlike traditional cloud systems that rename prefixes or copy files in S3 (which incurs request fees), this drive maps directories **virtually** in `metadata.json`. 
              Moving a folder, renaming it, or creating directories costs **zero AWS operations** and takes under 1 second.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
