export interface MP3Metadata {
  title: string | null
  artist: string[] | null
  album: string | null
  year: number | null
  track: number | null
  genre: string[] | null
  duration_seconds: number | null
  bitrate: number | null
  sample_rate: number | null
  channels: number | null
  file_path: string
}

export type SortField = 'title' | 'artist' | 'album' | 'track'
export type SortDirection = 'asc' | 'desc'
export type SortState = {
  sortBy: SortField | null
  sortDirection: SortDirection | null
}
