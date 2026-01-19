// Asset Types
export type AssetType = 'IMG' | 'VID';

export type Placement = 'story' | 'feed' | 'unknown';

export interface AssetMetadata {
  width: number;
  height: number;
  duration?: number;
  aspect_ratio: number;
}

export interface Asset {
  id: string;
  name: string;
  path: string;
  asset_type: AssetType;
  size_bytes?: number;
}

export interface ProcessedAsset {
  asset: Asset;
  metadata: AssetMetadata;
  placement: Placement;
  ocr_text: string;
  fingerprint: string;
  frame_paths: string[];
  thumbnail_url?: string;
  // Per-asset copy fields (for carousel cards)
  headline: string;
  description: string;
  // Custom filename override (user-edited)
  custom_filename?: string;
}

// Group Types
export type GroupType = 'standard' | 'carousel' | 'single';

export interface ConfidenceScores {
  group: number;
  product: number;
  offer: number;
}

export interface AdGroup {
  id: string;
  group_type: GroupType;
  assets: ProcessedAsset[];
  ad_number: number;
  product: string;
  hook: string;
  creator: string;
  offer: boolean;
  date: string;
  confidence: ConfidenceScores;
  format_token: string;
  // Copy fields
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  url: string;
  comment_media_buyer: string;
  comment_client: string;
}

export interface GroupedAssets {
  groups: AdGroup[];
  ungrouped: ProcessedAsset[];
}

// API Types
export interface AnalyzeRequest {
  folder_path: string;
  client?: string;
  start_number?: number;
  date?: string;
}

export interface ConfigResponse {
  default_date: string;
  default_start_number: number;
  client_options: string[];
}

export interface ExportRow {
  file_id: string;
  old_name: string;
  new_name: string;
  group_id: string;
  group_type: string;
  placement_inferred: string;
  confidence_group: number;
  confidence_product: number;
  confidence_offer: number;
}

// Auth Types
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: UserInfo;
  picker_api_key?: string;
  client_id?: string;
}

// Rename Types
export interface RenameResultItem {
  old_name: string;
  new_name: string;
  success: boolean;
  error?: string;
}

export interface RenameResult {
  total: number;
  success: number;
  failed: number;
  results: RenameResultItem[];
}
