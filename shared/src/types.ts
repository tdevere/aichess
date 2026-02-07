// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  country?: string;
  bio?: string;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  eloDaily: number;
  isOnline: boolean;
  isPremium: boolean;
  createdAt: Date;
}

export interface UserProfile extends User {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  achievements: Achievement[];
  privacySettings: PrivacySettings;
}

export interface PrivacySettings {
  profilePublic: boolean;
  showOnline: boolean;
  allowChallenges: boolean;
}

// Game Types
export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABORTED = 'aborted'
}

export enum GameResult {
  WHITE_WIN = 'white_win',
  BLACK_WIN = 'black_win',
  DRAW = 'draw',
  ABORTED = 'aborted'
}

export enum TimeControl {
  BULLET = 'bullet',
  BLITZ = 'blitz',
  RAPID = 'rapid',
  DAILY = 'daily',
  CUSTOM = 'custom'
}

export interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whitePlayer?: User;
  blackPlayer?: User;
  timeControl: TimeControl;
  timeLimit: number; // in seconds
  timeIncrement: number; // in seconds
  status: GameStatus;
  result?: GameResult;
  pgn: string;
  fen: string;
  currentTurn: 'w' | 'b';
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  isRated: boolean;
  startedAt?: Date;
  endedAt?: Date;
  moves: Move[];
}

export interface Move {
  id: string;
  gameId: string;
  moveNumber: number;
  san: string; // Standard Algebraic Notation
  fen: string;
  timestamp: Date;
  timeRemaining: number;
}

// Matchmaking Types
export interface MatchmakingRequest {
  userId: string;
  timeControl: TimeControl;
  timeLimit: number;
  timeIncrement: number;
  ratingRange: [number, number];
  isRated: boolean;
}

// Puzzle Types
export enum PuzzleDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum PuzzleTheme {
  CHECKMATE = 'checkmate',
  TACTICAL = 'tactical',
  ENDGAME = 'endgame',
  OPENING = 'opening',
  DEFENSIVE = 'defensive'
}

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // Solution moves
  rating: number;
  theme: PuzzleTheme;
  difficulty: PuzzleDifficulty;
  description?: string;
}

export interface PuzzleAttempt {
  userId: string;
  puzzleId: string;
  solved: boolean;
  attempts: number;
  timeSpent: number; // in seconds
  createdAt: Date;
}

// Lesson Types
export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  difficulty: PuzzleDifficulty;
  category: string;
  order: number;
  videoUrl?: string;
  duration: number; // in minutes
}

export interface UserProgress {
  userId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  completedAt?: Date;
}

// Tournament Types
export enum TournamentType {
  SWISS = 'swiss',
  ROUND_ROBIN = 'round_robin',
  ARENA = 'arena',
  ELIMINATION = 'elimination'
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  REGISTRATION = 'registration',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  timeControl: TimeControl;
  timeLimit: number;
  status: TournamentStatus;
  maxPlayers: number;
  currentPlayers: number;
  startTime: Date;
  prizePool?: string;
  createdBy: string;
}

// Social Types
export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked'
}

export interface Friendship {
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

// Notification Types
export enum NotificationType {
  GAME_START = 'game_start',
  MOVE_ALERT = 'move_alert',
  CHALLENGE = 'challenge',
  TOURNAMENT_INVITE = 'tournament_invite',
  FRIEND_REQUEST = 'friend_request',
  ACHIEVEMENT = 'achievement',
  MESSAGE = 'message'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

// Achievement Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  user: User;
  rating: number;
  gamesPlayed: number;
  winRate: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// WebSocket Events
export enum SocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // Game events
  JOIN_GAME = 'join_game',
  LEAVE_GAME = 'leave_game',
  MAKE_MOVE = 'make_move',
  MOVE_MADE = 'move_made',
  GAME_OVER = 'game_over',
  DRAW_OFFER = 'draw_offer',
  DRAW_RESPONSE = 'draw_response',
  RESIGN = 'resign',
  ABORT_GAME = 'abort_game',
  TIME_UPDATE = 'time_update',
  
  // Matchmaking
  JOIN_QUEUE = 'join_queue',
  LEAVE_QUEUE = 'leave_queue',
  MATCH_FOUND = 'match_found',
  
  // Chat
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  
  // Presence
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  
  // Notifications
  NEW_NOTIFICATION = 'new_notification'
}

export interface MakeMovePayload {
  gameId: string;
  move: string; // SAN notation
}

export interface MoveMadePayload {
  gameId: string;
  move: Move;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}
