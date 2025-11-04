export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string;
          onboarded: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string;
          onboarded?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string;
          onboarded?: boolean;
          created_at?: string;
        };
      };
      interests: {
        Row: {
          id: string;
          name: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          created_at?: string;
        };
      };
      user_interests: {
        Row: {
          user_id: string;
          interest_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          interest_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          interest_id?: string;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          event_type: string;
          organization: string;
          location: string;
          date: string;
          deadline: string | null;
          image_url: string;
          prize: string;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          event_type?: string;
          organization?: string;
          location?: string;
          date: string;
          deadline?: string | null;
          image_url?: string;
          prize?: string;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          event_type?: string;
          organization?: string;
          location?: string;
          date?: string;
          deadline?: string | null;
          image_url?: string;
          prize?: string;
          tags?: string[];
          created_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: string;
          google_calendar_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          status?: string;
          google_calendar_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          status?: string;
          google_calendar_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_events: {
        Row: {
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
          created_at?: string;
        };
      };
    };
  };
};
