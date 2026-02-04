/**
 * Error types for mcp-ffmpeg
 */

export enum FFmpegErrorType {
  FILE_NOT_FOUND = 'file_not_found',
  INVALID_INPUT = 'invalid_input',
  INVALID_PARAMETERS = 'invalid_parameters',
  FFMPEG_NOT_FOUND = 'ffmpeg_not_found',
  FFPROBE_NOT_FOUND = 'ffprobe_not_found',
  PROCESSING_ERROR = 'processing_error',
  REMOTE_API_ERROR = 'remote_api_error',
  TIMEOUT = 'timeout',
  PERMISSION_DENIED = 'permission_denied',
  OUTPUT_DIR_ERROR = 'output_dir_error',
  PARSE_ERROR = 'parse_error',
}
