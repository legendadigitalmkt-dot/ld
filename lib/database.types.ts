export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          text: string
          type: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          text: string
          type: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          text?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_json: Json
          action_type: string
          condition_json: Json
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_json?: Json
          action_type: string
          condition_json?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_json?: Json
          action_type?: string
          condition_json?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_channels: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          display_value: string | null
          external_id: string
          id: string
          metadata: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          display_value?: string | null
          external_id: string
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          display_value?: string | null
          external_id?: string
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_channels_contact_same_workspace"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "contact_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          intake_key: string | null
          last_interaction_at: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          source: string
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          intake_key?: string | null
          last_interaction_at?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          source?: string
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          intake_key?: string | null
          last_interaction_at?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          source?: string
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          status: string
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_same_workspace"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          last_activity_at: string
          lost_at: string | null
          owner_user_id: string | null
          probability: number
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value: number
          won_at: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          last_activity_at?: string
          lost_at?: string | null
          owner_user_id?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value?: number
          won_at?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          lost_at?: string | null
          owner_user_id?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value?: number
          won_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_same_workspace"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          external_account_id: string | null
          external_resource_id: string | null
          id: string
          last_error: string | null
          metadata: Json
          provider: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          external_resource_id?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          external_resource_id?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_status_events: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          external_message_id: string
          id: string
          message_id: string
          metadata: Json
          occurred_at: string
          recipient_wa_id: string | null
          status: Database["public"]["Enums"]["message_delivery_status"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_message_id: string
          id?: string
          message_id: string
          metadata?: Json
          occurred_at: string
          recipient_wa_id?: string | null
          status: Database["public"]["Enums"]["message_delivery_status"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_message_id?: string
          id?: string
          message_id?: string
          metadata?: Json
          occurred_at?: string
          recipient_wa_id?: string | null
          status?: Database["public"]["Enums"]["message_delivery_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_name: string | null
          body: string
          conversation_id: string
          created_at: string
          delivery_status:
            | Database["public"]["Enums"]["message_delivery_status"]
            | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_code: string | null
          error_message: string | null
          external_message_id: string | null
          id: string
          message_type: string
          metadata: Json
          recipient_wa_id: string | null
          reply_to_external_message_id: string | null
          sender_wa_id: string | null
          sent_at: string
          status_updated_at: string | null
          workspace_id: string
        }
        Insert: {
          author_name?: string | null
          body: string
          conversation_id: string
          created_at?: string
          delivery_status?:
            | Database["public"]["Enums"]["message_delivery_status"]
            | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_code?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          recipient_wa_id?: string | null
          reply_to_external_message_id?: string | null
          sender_wa_id?: string | null
          sent_at?: string
          status_updated_at?: string | null
          workspace_id: string
        }
        Update: {
          author_name?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          delivery_status?:
            | Database["public"]["Enums"]["message_delivery_status"]
            | null
          direction?: Database["public"]["Enums"]["message_direction"]
          error_code?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          recipient_wa_id?: string | null
          reply_to_external_message_id?: string | null
          sender_wa_id?: string | null
          sent_at?: string
          status_updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_same_workspace"
            columns: ["conversation_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_user_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_user_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_user_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_same_workspace"
            columns: ["contact_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "tasks_deal_same_workspace"
            columns: ["deal_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error_message: string | null
          event_key: string
          event_type: string
          external_resource_id: string | null
          id: string
          metadata: Json
          payload_hash: string
          processed_at: string | null
          processing_status: string
          provider: string
          received_at: string
          workspace_id: string | null
        }
        Insert: {
          error_message?: string | null
          event_key: string
          event_type: string
          external_resource_id?: string | null
          id?: string
          metadata?: Json
          payload_hash: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          received_at?: string
          workspace_id?: string | null
        }
        Update: {
          error_message?: string | null
          event_key?: string
          event_type?: string
          external_resource_id?: string | null
          id?: string
          metadata?: Json
          payload_hash?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          received_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["member_role"]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["member_role"]
          token_hash: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["member_role"]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          segment: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          segment?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          segment?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_member_slot: { Args: { p_workspace_id: string; p_email: string; p_role: Database["public"]["Enums"]["member_role"] }; Returns: string }
      complete_member_slot: { Args: { p_reservation_id: string; p_user_id: string }; Returns: undefined }
      cancel_member_slot: { Args: { p_reservation_id: string }; Returns: undefined }
      workspace_plan: { Args: { p_workspace_id: string }; Returns: Json }
      platform_plans: { Args: { p_workspace_id?: string | null; p_query?: string; p_workspace_query?: string; p_plan_id?: string | null }; Returns: Json }
      platform_save_plan: { Args: { p_id: string | null; p_code: string; p_name: string; p_description: string; p_status: string; p_config: Json; p_revision: number; p_reason: string; p_confirmed: boolean }; Returns: string }
      platform_publish_plan: { Args: { p_id: string; p_revision: number; p_reason: string; p_confirmed: boolean }; Returns: string }
      platform_assign_plan: { Args: { p_workspace_id: string; p_version_id: string | null; p_revision: number; p_reason: string; p_confirmed: boolean }; Returns: undefined }
      workspace_modules: { Args: { p_workspace_id: string }; Returns: Json }
      platform_product: { Args: { p_workspace_id?: string | null; p_query?: string }; Returns: Json }
      platform_set_feature_rule: {
        Args: { p_feature: string; p_workspace_id: string | null; p_state: string; p_revision: number; p_global_revision: number; p_reason: string; p_confirmed: boolean }
        Returns: undefined
      }
			account_access: { Args: Record<string, never>; Returns: boolean };
			platform_context: { Args: Record<string, never>; Returns: Json };
			platform_overview: { Args: Record<string, never>; Returns: Json };
			platform_users: {
				Args: { p_query?: string; p_status?: string; p_page?: number };
				Returns: Json;
			};
			platform_workspaces: {
				Args: { p_query?: string; p_status?: string; p_page?: number };
				Returns: Json;
			};
			platform_audit: {
				Args: { p_query?: string; p_page?: number };
				Returns: Json;
			};
			platform_roles: { Args: Record<string, never>; Returns: Json };
			platform_settings: { Args: Record<string, never>; Returns: Json };
			platform_set_status: {
				Args: {
					p_entity: string;
					p_id: string;
					p_status: string;
					p_expected_status: string;
					p_reason: string;
					p_confirmed: boolean;
				};
				Returns: undefined;
			};
			platform_set_role: {
				Args: {
					p_user: string;
					p_role: string;
					p_enabled: boolean;
					p_reason: string;
					p_confirmed: boolean;
				};
				Returns: undefined;
			};
			platform_save_settings: {
				Args: {
					p_revision: number;
					p_name: string;
					p_timezone: string;
					p_email: string;
					p_reason: string;
					p_confirmed: boolean;
				};
				Returns: undefined;
			};
      contact_context: { Args: { p_workspace_id: string; p_contact_id: string; p_history_page?: number }; Returns: Json }
      update_contact_profile: { Args: { p_workspace_id: string; p_contact_id: string; p_expected_updated_at: string; p_name: string; p_company: string | null; p_email: string | null; p_phone: string | null; p_source: string; p_status: Database["public"]["Enums"]["contact_status"]; p_tags: string[]; p_owner_user_id: string | null }; Returns: string }
      add_contact_note: { Args: { p_workspace_id: string; p_contact_id: string; p_body: string; p_request_id: string }; Returns: string }
      update_workspace_profile: { Args: { p_workspace_id: string; p_expected_updated_at: string; p_name: string; p_segment: string | null; p_timezone: string }; Returns: string }
      growth_overview: { Args: { p_workspace_id: string; p_days?: number }; Returns: Json }
      create_workspace_task: { Args: { p_workspace_id: string; p_title: string; p_priority?: Database["public"]["Enums"]["task_priority"]; p_due_at?: string | null; p_contact_id?: string | null; p_deal_id?: string | null }; Returns: string }
      set_workspace_task_status: { Args: { p_workspace_id: string; p_task_id: string; p_status: Database["public"]["Enums"]["task_status"] }; Returns: string }

      create_lead_with_deal: {
        Args: {
          p_intake_key?: string
          p_name: string
          p_phone?: string | null
          p_source?: string
          p_workspace_id: string
        }
        Returns: {
          contact_id: string
          deal_id: string
        }[]
      }
      move_deal_stage: {
        Args: {
          p_deal_id: string
          p_stage: Database["public"]["Enums"]["deal_stage"]
          p_workspace_id: string
        }
        Returns: {
          current_stage: Database["public"]["Enums"]["deal_stage"]
          deal_id: string
          lost_at: string
          previous_stage: Database["public"]["Enums"]["deal_stage"]
          probability: number
          won_at: string
        }[]
      }
      update_deal_value: {
        Args: { p_deal_id: string; p_value: number; p_workspace_id: string }
        Returns: {
          current_value: number
          deal_id: string
          previous_value: number
        }[]
      }
    }
    Enums: {
      contact_status: "lead" | "customer" | "inactive"
      deal_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      member_role: "owner" | "admin" | "sales" | "support" | "viewer"
      message_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "deleted"
      message_direction: "in" | "out"
      task_priority: "low" | "medium" | "high"
      task_status: "open" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contact_status: ["lead", "customer", "inactive"],
      deal_stage: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      member_role: ["owner", "admin", "sales", "support", "viewer"],
      message_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "read",
        "failed",
        "deleted",
      ],
      message_direction: ["in", "out"],
      task_priority: ["low", "medium", "high"],
      task_status: ["open", "done"],
    },
  },
} as const
