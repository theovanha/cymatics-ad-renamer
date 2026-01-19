import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import GoogleSignIn from '../components/GoogleSignIn';
import AssetTable from '../components/AssetTable';
import { useGooglePicker } from '../hooks/useGooglePicker';
import type { AuthStatus, GroupedAssets, AdGroup } from '../types';

// Copy Doc Template type
interface CopyDocTemplate {
  id: string;
  file_id: string;
  name: string;
}

// Circular progress wheel component
function ProgressWheel({ message }: { message: string }) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newProgress = Math.min(95, 95 * (1 - Math.exp(-elapsed / 15)));
      setProgress(Math.round(newProgress));
    }, 200);
    
    return () => clearInterval(interval);
  }, []);
  
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="progress-wheel-container">
      <div className="progress-wheel">
        <svg viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--bg-tertiary, #2a2a3e)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        <div className="progress-percent">{progress}%</div>
      </div>
      <p className="progress-message">{message}</p>
    </div>
  );
}

// Bulk apply toolbar component
function BulkApplyToolbar({ 
  onApply, 
  onRenumber,
  onFetchFromSheet,
  currentStartNumber,
  isFetchingNumber
}: { 
  onApply: (field: string, value: string | boolean) => void;
  onRenumber: (startNumber: number) => void;
  onFetchFromSheet: () => Promise<void>;
  currentStartNumber: number;
  isFetchingNumber: boolean;
}) {
  const [product, setProduct] = useState('');
  const [creator, setCreator] = useState('');
  const [offer, setOffer] = useState(false);
  const [startNumber, setStartNumber] = useState(currentStartNumber);
  
  useEffect(() => {
    setStartNumber(currentStartNumber);
  }, [currentStartNumber]);

  return (
    <div className="bulk-toolbar">
      <span className="bulk-label">Starting Ad #:</span>
      <div className="bulk-field">
        <input
          type="number"
          value={startNumber}
          onChange={e => setStartNumber(parseInt(e.target.value) || 1)}
          min={1}
          className="bulk-input bulk-input-number"
          placeholder="1"
        />
        <button 
          className="bulk-btn bulk-btn-fetch"
          onClick={onFetchFromSheet}
          disabled={isFetchingNumber}
          title="Fetch next number from Google Sheet"
        >
          {isFetchingNumber ? '...' : '🔄'}
        </button>
        <button 
          className="bulk-btn"
          onClick={() => { onRenumber(startNumber); }}
        >
          Apply
        </button>
      </div>

      <div className="bulk-divider"></div>

      <span className="bulk-label">Apply to all:</span>
      
      <div className="bulk-field">
        <input
          type="text"
          value={product}
          onChange={e => setProduct(e.target.value)}
          placeholder="Product"
          className="bulk-input"
        />
        <button 
          className="bulk-btn"
          onClick={() => { onApply('product', product); }}
          disabled={!product}
        >
          Apply
        </button>
      </div>

      <div className="bulk-field">
        <input
          type="text"
          value={creator}
          onChange={e => setCreator(e.target.value)}
          placeholder="Creator"
          className="bulk-input"
        />
        <button 
          className="bulk-btn"
          onClick={() => { onApply('creator', creator); }}
          disabled={!creator}
        >
          Apply
        </button>
      </div>

      <div className="bulk-field">
        <label className="bulk-checkbox">
          <input
            type="checkbox"
            checked={offer}
            onChange={e => setOffer(e.target.checked)}
          />
          <span>Colab</span>
        </label>
        <button 
          className="bulk-btn"
          onClick={() => { onApply('offer', offer); }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function UnifiedPage() {
  // Setup state
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [folderPath, setFolderPath] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSetupCollapsed, setIsSetupCollapsed] = useState(false);
  
  // Review state
  const [analyzedGroups, setAnalyzedGroups] = useState<GroupedAssets | null>(null);
  const [fetchedStartNumber, setFetchedStartNumber] = useState<number | null>(null);
  const [isFetchingNumber, setIsFetchingNumber] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [copyDocTemplates, setCopyDocTemplates] = useState<CopyDocTemplate[]>([]);
  const [copyDocOpen, setCopyDocOpen] = useState(false);
  const [copyingDoc, setCopyingDoc] = useState(false);
  const [copyProgress, setCopyProgress] = useState(0);
  const [isPastingToSheet, setIsPastingToSheet] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const copyDocRef = useRef<HTMLDivElement>(null);
  
  // Debug state
  const [isRecording, setIsRecording] = useState(false);
  const [debugData, setDebugData] = useState<string>('');
  
  // Fetch auth status on mount
  useEffect(() => {
    api.getAuthStatus()
      .then(setAuthStatus)
      .catch(err => {
        console.error('Failed to get auth status:', err);
        setAuthStatus({ authenticated: false });
      });
  }, []);

  // Load copy doc templates when we have analyzed groups
  useEffect(() => {
    if (analyzedGroups) {
      api.getCopyDocTemplates()
        .then(res => setCopyDocTemplates(res.templates))
        .catch(err => console.error('Failed to load templates:', err));
    }
  }, [analyzedGroups]);

  // Close copy doc dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (copyDocRef.current && !copyDocRef.current.contains(event.target as Node)) {
        setCopyDocOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFolderSelected = useCallback((folderId: string, folderName: string) => {
    setFolderPath(folderId);
    setSelectedFolderName(folderName);
    setError(null);
  }, []);

  const { openPicker, isLoading: pickerLoading, isReady: pickerReady } = useGooglePicker({
    apiKey: authStatus?.picker_api_key || '',
    clientId: authStatus?.client_id || '',
    onFolderSelected: handleFolderSelected,
  });

  const handleAuthChange = useCallback(() => {
    api.getAuthStatus()
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ authenticated: false }));
  }, []);

  const handleOpenPicker = async () => {
    try {
      await openPicker();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open picker');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderPath.trim()) {
      setError('Please enter a folder path or select a Google Drive folder');
      return;
    }

    const isDrivePath = folderPath.includes('drive.google.com') || 
      (folderPath.length > 20 && !folderPath.startsWith('/') && !folderPath.includes(' '));
    
    if (isDrivePath && !authStatus?.authenticated) {
      setError('Please sign in with Google to access Drive folders');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const progressMessages = isDrivePath ? [
      'Connecting to Google Drive...',
      'Listing files in folder...',
      'Downloading assets for analysis...',
      'Extracting metadata...',
      'Running image analysis...',
      'Grouping similar assets...',
      'Almost done...',
    ] : [
      'Reading folder...',
      'Analyzing assets...',
      'Grouping similar assets...',
    ];
    
    let messageIndex = 0;
    setLoadingMessage(progressMessages[0]);
    
    const messageInterval = setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, progressMessages.length - 1);
      setLoadingMessage(progressMessages[messageIndex]);
    }, 3000);
    
    try {
      const result = await api.analyze({
        folder_path: folderPath.trim(),
      });
      
      clearInterval(messageInterval);
      setAnalyzedGroups(result);
      setIsSetupCollapsed(true);
    } catch (err) {
      clearInterval(messageInterval);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleNewAnalysis = () => {
    setIsSetupCollapsed(false);
    setAnalyzedGroups(null);
    setFolderPath('');
    setSelectedFolderName(null);
    setError(null);
    setFetchedStartNumber(null);
    setDebugData('');
    setIsRecording(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Review handlers
  const handleGroupUpdate = async (groupId: string, updates: Partial<AdGroup>) => {
    if (!analyzedGroups) return;
    try {
      await api.updateGroup(groupId, updates);
      const newData = await api.getGroups();
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  };

  const handleBulkApply = useCallback(async (field: string, value: string | boolean) => {
    if (!analyzedGroups) return;
    
    try {
      for (const group of analyzedGroups.groups) {
        await api.updateGroup(group.id, { [field]: value });
      }
      const newData = await api.getGroups();
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Bulk apply failed:', err);
    }
  }, [analyzedGroups]);

  const handleRenumber = useCallback(async (startNumber: number) => {
    try {
      const response = await fetch('/api/groups/renumber', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_number: startNumber }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Renumber failed');
      const newData = await api.getGroups();
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Renumber failed:', err);
    }
  }, []);

  const handleFetchFromSheet = useCallback(async () => {
    setIsFetchingNumber(true);
    try {
      const result = await api.getLastAdNumber();
      setFetchedStartNumber(result.next_ad_number);
      await handleRenumber(result.next_ad_number);
      showSuccess(`✓ Fetched starting number: ${result.next_ad_number}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch from sheet';
      showSuccess(`✗ ${message}`);
    } finally {
      setIsFetchingNumber(false);
    }
  }, [handleRenumber]);

  const handleRegroupAsset = useCallback(async (assetId: string, targetGroupId: string | null, destinationIndex?: number) => {
    try {
      const newData = await api.regroupAsset(assetId, targetGroupId, destinationIndex);
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Failed to regroup asset:', err);
    }
  }, []);

  const handleReorderAsset = useCallback(async (groupId: string, assetId: string, newIndex: number) => {
    try {
      await api.reorderAsset(groupId, assetId, newIndex);
      const newData = await api.getGroups();
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Failed to reorder asset:', err);
    }
  }, []);

  const handleUpdateAssetFilename = useCallback(async (groupId: string, assetId: string, customFilename: string) => {
    try {
      await api.updateAsset(groupId, assetId, { custom_filename: customFilename });
      const newData = await api.getGroups();
      setAnalyzedGroups(newData);
    } catch (err) {
      console.error('Failed to update filename:', err);
    }
  }, []);

  const handleRenameInDrive = async () => {
    if (!confirm('This will rename all files in Google Drive. Are you sure?')) {
      return;
    }
    
    setRenaming(true);
    try {
      const result = await api.renameFilesInDrive();
      if (result.failed > 0) {
        showSuccess(`✓ Renamed ${result.success}/${result.total} files (${result.failed} failed)`);
      } else {
        showSuccess(`✓ Renamed all ${result.total} files`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('only works with Google Drive')) {
        showSuccess('✗ Rename only works with Google Drive');
      } else {
        showSuccess(`✗ Rename failed: ${message}`);
      }
    } finally {
      setRenaming(false);
    }
  };

  const handleCopyDoc = async (templateId: string) => {
    setCopyingDoc(true);
    setCopyProgress(0);
    setCopyDocOpen(false);
    
    const progressInterval = setInterval(() => {
      setCopyProgress(prev => Math.min(prev + 15, 90));
    }, 400);
    
    try {
      const result = await api.copyDocToFolder(templateId);
      clearInterval(progressInterval);
      setCopyProgress(100);
      setTimeout(() => {
        showSuccess(`✓ Added "${result.name}" to folder`);
        setCopyingDoc(false);
        setCopyProgress(0);
      }, 200);
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : 'Unknown error';
      showSuccess(`✗ Failed: ${message}`);
      setCopyingDoc(false);
      setCopyProgress(0);
    }
  };

  const handlePasteToSheet = async () => {
    if (!sortedGroups || sortedGroups.length === 0) {
      showSuccess('✗ No ad names to paste');
      return;
    }

    setIsPastingToSheet(true);
    try {
      const adNames = sortedGroups.map(group => {
        const adNum = String(group.ad_number).padStart(3, '0');
        const parts = [adNum];
        if (group.product) parts.push(group.product);
        parts.push(group.format_token);
        if (group.hook) parts.push(group.hook);
        if (group.creator) parts.push(group.creator);
        if (group.offer) parts.push('Colab');
        if (group.date) parts.push(group.date);
        return parts.join('_').replace(/__+/g, '_');
      });

      const result = await api.pasteAdNamesToSheet(adNames);
      showSuccess(`✓ Pasted ${result.rows_added} ad names to sheet (starting at row ${result.first_row})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showSuccess(`✗ Failed to paste: ${message}`);
    } finally {
      setIsPastingToSheet(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        const response = await fetch('/api/debug/analysis');
        const debug = await response.json();
        setDebugData(JSON.stringify(debug, null, 2));
      } catch (err) {
        setDebugData('Failed to fetch debug data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } else {
      setDebugData('');
    }
    setIsRecording(!isRecording);
  };

  const copyDebugData = () => {
    navigator.clipboard.writeText(debugData);
    alert('Debug data copied to clipboard!');
  };

  // Sort groups by first asset's filename
  const getFirstFilename = (group: AdGroup): string => {
    if (group.assets.length === 0) return '';
    return group.assets[0].asset.name;
  };

  const extractNumber = (filename: string): number => {
    const match = filename.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  const sortedGroups = analyzedGroups?.groups.slice().sort((a, b) => {
    const aName = getFirstFilename(a);
    const bName = getFirstFilename(b);
    const aNum = extractNumber(aName);
    const bNum = extractNumber(bName);
    
    if (aNum !== Infinity && bNum !== Infinity) {
      return aNum - bNum;
    }
    return aName.localeCompare(bName);
  }) || [];

  const totalAssets = sortedGroups.reduce((sum, g) => sum + g.assets.length, 0);

  return (
    <div className="unified-page">
      {successMessage && (
        <div className="success-toast">{successMessage}</div>
      )}

      {/* Header Section - Always Visible */}
      <div className={`header-section ${isSetupCollapsed ? 'collapsed' : ''}`}>
        <div className="header-content">
          <div className="header-left">
            <h2>VANHA Creative Auto-Namer</h2>
            {isSetupCollapsed && selectedFolderName && (
              <span className="current-folder">
                {selectedFolderName}
              </span>
            )}
          </div>
          <div className="header-right">
            {isSetupCollapsed && (
              <button 
                className="btn-new-analysis"
                onClick={handleNewAnalysis}
              >
                🔄 New Analysis
              </button>
            )}
            {!isSetupCollapsed && <GoogleSignIn authStatus={authStatus} onAuthChange={handleAuthChange} />}
          </div>
        </div>
      </div>

      {/* Setup Form Section - Collapsible */}
      {!isSetupCollapsed && (
        <div className="setup-section">
          <div className="setup-container">
            {!loading && <GoogleSignIn authStatus={authStatus} onAuthChange={handleAuthChange} />}
            
            <form onSubmit={handleSubmit} className="setup-form">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {authStatus?.authenticated && (
                <div className="picker-section">
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    disabled={!pickerReady || pickerLoading || loading}
                    className="btn-picker"
                  >
                    {pickerLoading ? (
                      <>
                        <span className="spinner-sm"></span>
                        Opening...
                      </>
                    ) : !pickerReady ? (
                      <>
                        <span className="spinner-sm"></span>
                        Loading Picker...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.71 3.5L1.15 15l3.43 6h13.71l3.43-6L15.16 3.5H7.71zm-.71 1h2.67l2.74 4.75H5.92l3.08-5.75zm6.62 0H16l3.08 5.75h-6.49L15.33 4.5zm4.84 6.75l-2.88 5h-2.61l2.88-5h2.61zm-9.92 0l2.88 5H8.81l-2.88-5h2.9zm-2.89 1l2.88 5H4.02l-2.29-4 1.91-1zm12.7 0l1.91 1-2.29 4h-2.51l2.89-5z"/>
                        </svg>
                        Open Google Drive
                      </>
                    )}
                  </button>
                  {selectedFolderName && (
                    <div className="selected-folder">
                      Selected: <strong>{selectedFolderName}</strong>
                    </div>
                  )}
                  <div className="divider">
                    <span>or paste a link / path</span>
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="folderPath">
                  {authStatus?.authenticated ? 'Google Drive Link or Local Path' : 'Local Folder Path'}
                </label>
                <input
                  id="folderPath"
                  type="text"
                  value={folderPath}
                  onChange={e => {
                    setFolderPath(e.target.value);
                    setSelectedFolderName(null);
                  }}
                  placeholder={
                    authStatus?.authenticated 
                      ? 'https://drive.google.com/drive/folders/... or /path/to/local'
                      : '/path/to/assets'
                  }
                  disabled={loading}
                  autoFocus={!authStatus?.authenticated}
                />
                <span className="hint">
                  {authStatus?.authenticated 
                    ? 'Paste a Google Drive folder link, folder ID, or local path'
                    : 'Sign in above to use Google Drive, or enter a local folder path'
                  }
                </span>
              </div>
              
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary btn-lg"
                  disabled={loading || !folderPath.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-sm"></span>
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Assets'
                  )}
                </button>
              </div>

              {loading && (
                <div className="progress-section">
                  <ProgressWheel message={loadingMessage} />
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Review Section - Conditionally Rendered */}
      {analyzedGroups && (
        <div className="review-section">
          <div className="review-top-row">
            <div className="top-left">
              <span className="mini-brand">VANHA AD RENAMER</span>
            </div>
            <div className="top-right">
              <button 
                className={`btn-debug ${isRecording ? 'recording' : ''}`} 
                onClick={handleToggleRecording}
              >
                {isRecording ? '⏹ Stop' : '🔴 Debug'}
              </button>
            </div>
          </div>

          {isRecording && (
            <div className="debug-recording-indicator">
              <span className="recording-dot"></span>
              Recording... Make changes, then click "Stop Recording" to capture debug data.
            </div>
          )}

          {!isRecording && debugData && (
            <div className="debug-panel">
              <div className="debug-header">
                <span>Debug Data (click to copy)</span>
                <button className="debug-copy-btn" onClick={copyDebugData}>
                  📋 Copy to Clipboard
                </button>
                <button className="debug-clear-btn" onClick={() => setDebugData('')}>
                  ✕ Clear
                </button>
              </div>
              <pre className="debug-content">{debugData}</pre>
            </div>
          )}

          <div className="review-actions-bar">
            <span className="asset-count">
              {totalAssets} asset{totalAssets !== 1 ? 's' : ''} in {analyzedGroups.groups.length} group{analyzedGroups.groups.length !== 1 ? 's' : ''}
            </span>
            
            <div className="review-actions">
              <button 
                className="btn-paste-sheet"
                onClick={handlePasteToSheet}
                disabled={isPastingToSheet}
                title="Paste all ad names to Google Sheet"
              >
                {isPastingToSheet ? (
                  <>
                    <span className="mini-spinner"></span>
                    Pasting...
                  </>
                ) : (
                  '📊 Paste to Sheet'
                )}
              </button>

              <button
                className="btn-open-sheet"
                onClick={() => window.open('https://docs.google.com/spreadsheets/d/1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc/edit', '_blank')}
                title="Open the ad tracker Google Sheet"
              >
                📋 Open Ad Tracker
              </button>
              
              <button
                className="btn-drive"
                onClick={handleRenameInDrive}
                disabled={renaming}
                title="Rename files directly in Google Drive"
              >
                {renaming ? 'Renaming...' : '📁 Rename in Drive'}
              </button>

              <div className="copy-doc-dropdown" ref={copyDocRef}>
                <button
                  className="btn-copy-doc"
                  onClick={() => setCopyDocOpen(!copyDocOpen)}
                  disabled={copyingDoc || copyDocTemplates.length === 0}
                  title="Add a copy doc template to the folder"
                >
                  {copyingDoc ? (
                    <span className="copy-progress">
                      <span className="mini-spinner"></span>
                      {copyProgress}%
                    </span>
                  ) : '📄 Add Copy Doc ▾'}
                </button>
                {copyDocOpen && copyDocTemplates.length > 0 && (
                  <div className="copy-doc-menu">
                    {copyDocTemplates.map(template => (
                      <button
                        key={template.id}
                        className="copy-doc-item"
                        onClick={() => handleCopyDoc(template.id)}
                        disabled={copyingDoc}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <BulkApplyToolbar 
            onApply={handleBulkApply} 
            onRenumber={handleRenumber}
            onFetchFromSheet={handleFetchFromSheet}
            currentStartNumber={fetchedStartNumber || sortedGroups[0]?.ad_number || 1}
            isFetchingNumber={isFetchingNumber}
          />
          
          <AssetTable
            groups={sortedGroups}
            onUpdateGroup={handleGroupUpdate}
            onRegroupAsset={handleRegroupAsset}
            onReorderAsset={handleReorderAsset}
            onUpdateAssetFilename={handleUpdateAssetFilename}
          />
          
          {analyzedGroups.ungrouped.length > 0 && (
            <div className="ungrouped-section">
              <h3>Ungrouped Assets ({analyzedGroups.ungrouped.length})</h3>
              <div className="ungrouped-list">
                {analyzedGroups.ungrouped.map(asset => (
                  <div key={asset.asset.id} className="ungrouped-item">
                    <span className="ungrouped-name">{asset.asset.name}</span>
                    <span className="badge badge-warning">{asset.placement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <style>{`
        .unified-page {
          position: relative;
          min-height: 100vh;
        }

        /* Success Toast */
        .success-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: rgba(35, 134, 54, 0.95);
          color: white;
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
          max-width: 400px;
          font-size: 0.875rem;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Header Section */
        .header-section {
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          padding: var(--space-lg) var(--space-xl);
          transition: padding 0.3s ease;
        }

        .header-section.collapsed {
          padding: var(--space-md) var(--space-xl);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1600px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .header-left h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
        }

        .header-section.collapsed .header-left h2 {
          font-size: 1.1rem;
        }

        .current-folder {
          padding: 0.3rem 0.6rem;
          background: rgba(52, 168, 83, 0.1);
          border: 1px solid rgba(52, 168, 83, 0.3);
          border-radius: var(--radius-sm);
          color: #34a853;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .btn-new-analysis {
          padding: var(--space-sm) var(--space-lg);
          background: linear-gradient(135deg, #58a6ff, #a371f7);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-new-analysis:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3);
        }

        /* Setup Section */
        .setup-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: var(--space-xl) 0;
        }
        
        .setup-container {
          width: 100%;
          max-width: 520px;
          padding: 0 var(--space-lg);
        }
        
        .setup-form {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-top: var(--space-lg);
        }
        
        .error-message {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: var(--radius-md);
          color: var(--accent-danger);
          padding: var(--space-md);
          margin-bottom: var(--space-lg);
        }

        .picker-section {
          margin-bottom: var(--space-lg);
        }

        .btn-picker {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: var(--space-md);
          background: linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335);
          background-size: 300% 300%;
          animation: gradient-shift 8s ease infinite;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
        }

        .btn-picker:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-picker:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .selected-folder {
          margin-top: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: rgba(52, 168, 83, 0.1);
          border: 1px solid rgba(52, 168, 83, 0.3);
          border-radius: var(--radius-sm);
          color: #34a853;
          font-size: 0.875rem;
        }

        .divider {
          display: flex;
          align-items: center;
          margin-top: var(--space-lg);
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }

        .divider span {
          padding: 0 var(--space-md);
        }
        
        .form-group input {
          font-size: 1rem;
          padding: var(--space-md);
        }
        
        .hint {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: var(--space-xs);
        }
        
        .form-actions {
          margin-top: var(--space-lg);
        }
        
        .btn-lg {
          width: 100%;
          padding: var(--space-md) var(--space-xl);
          font-size: 1rem;
        }

        .progress-section {
          margin-top: var(--space-xl);
          text-align: center;
        }

        .progress-wheel-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
        }

        .progress-wheel {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .progress-wheel svg {
          width: 100%;
          height: 100%;
          animation: rotate-wheel 8s linear infinite;
        }

        @keyframes rotate-wheel {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .progress-wheel svg circle:last-of-type {
          animation: none;
        }

        .progress-percent {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .progress-message {
          font-size: 0.875rem;
          color: var(--text-secondary);
          animation: fade-in-out 3s ease-in-out infinite;
          max-width: 300px;
        }

        @keyframes fade-in-out {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Review Section */
        .review-section {
          max-width: 1600px;
          margin: 0 auto;
          padding: var(--space-lg) var(--space-xl);
        }

        .review-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }

        .top-left {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .top-right {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .mini-brand {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          opacity: 0.6;
        }

        .btn-debug {
          padding: 0.3rem 0.6rem;
          font-size: 0.7rem;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-debug:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .btn-debug.recording {
          background: rgba(248, 81, 73, 0.15);
          border-color: var(--accent-danger);
          color: var(--accent-danger);
        }

        .debug-recording-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          margin-bottom: var(--space-md);
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: var(--radius-md);
          color: var(--accent-danger);
          font-size: 0.8rem;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-danger);
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .debug-panel {
          margin-bottom: var(--space-lg);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 0.75rem;
          font-weight: 600;
          gap: var(--space-sm);
        }

        .debug-copy-btn,
        .debug-clear-btn {
          padding: 0.25rem 0.5rem;
          font-size: 0.7rem;
          border-radius: 4px;
          cursor: pointer;
          border: none;
        }

        .debug-copy-btn {
          background: var(--accent-primary);
          color: white;
        }

        .debug-clear-btn {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border-color);
        }

        .debug-content {
          padding: var(--space-md);
          margin: 0;
          font-family: monospace;
          font-size: 0.65rem;
          color: var(--text-secondary);
          max-height: 300px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .review-actions-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
          flex-wrap: wrap;
          gap: var(--space-md);
        }

        .asset-count {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .review-actions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }

        .mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .copy-doc-dropdown {
          position: relative;
        }

        .copy-doc-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.25rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 100;
          min-width: 200px;
          overflow: hidden;
        }

        .copy-doc-item {
          display: block;
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: none;
          text-align: left;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.15s;
        }

        .copy-doc-item:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        .copy-doc-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .copy-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Bulk Toolbar */
        .bulk-toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
          flex-wrap: wrap;
        }

        .bulk-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .bulk-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .bulk-input,
        .bulk-input-number {
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          min-width: 0;
        }

        .bulk-input {
          width: 150px;
        }

        .bulk-input-number {
          width: 80px;
          text-align: center;
        }

        .bulk-btn {
          padding: 0.4rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .bulk-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .bulk-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bulk-btn-fetch {
          min-width: 36px;
          padding: 0.4rem 0.6rem;
          background: var(--accent-secondary);
        }

        .bulk-divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
        }

        .bulk-checkbox {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .bulk-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        /* Ungrouped Section */
        .ungrouped-section {
          margin-top: var(--space-xl);
          padding: var(--space-lg);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }

        .ungrouped-section h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--space-md);
          color: var(--text-secondary);
        }

        .ungrouped-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .ungrouped-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
        }

        .ungrouped-name {
          color: var(--text-primary);
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}
