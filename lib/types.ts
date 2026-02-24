export type UserRole = 'teacher' | 'admin' | 'student';

export type VocalType =
  | 'Bass'
  | 'Baritone'
  | 'Tenor'
  | 'Counter Tenor'
  | 'Alto'
  | 'Mezzo Soprano'
  | 'Soprano';

export const VOCAL_TYPES: VocalType[] = [
  'Bass',
  'Baritone',
  'Tenor',
  'Counter Tenor',
  'Alto',
  'Mezzo Soprano',
  'Soprano',
];

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  full_name: string | null;
  role: UserRole;
  vocal_type: VocalType | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  is_call_active: boolean;
  call_channel_name: string | null;
  created_at: string;
}

export interface ClassroomMember {
  id: string;
  classroom_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  classroom_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ClassroomWithMembers extends Classroom {
  member_count: number;
  members: Profile[];
}
