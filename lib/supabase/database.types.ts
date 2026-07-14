export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      backtest_session_metrics: {
        Row: {
          category: string
          metric_key: string
          metric_label: string
          scope: string
          session_id: string
          unit: string
          value: number
        }
        Insert: Database["public"]["Tables"]["backtest_session_metrics"]["Row"]
        Update: Partial<
          Database["public"]["Tables"]["backtest_session_metrics"]["Insert"]
        >
        Relationships: []
      }
      backtest_sessions: {
        Row: {
          account_size: number | null
          archived_at: string | null
          created_at: string
          ended_at: string
          id: string
          name: string
          net_pnl: number
          pair: string
          period_days: number
          pnl_percent: number
          report_filename: string | null
          report_path: string | null
          source_filename: string
          source_path: string | null
          started_at: string
          strategy_id: string
          tags: string[]
          trade_count: number
          user_id: string
        }
        Insert: {
          account_size?: number | null
          archived_at?: string | null
          created_at?: string
          ended_at: string
          id?: string
          name: string
          net_pnl: number
          pair: string
          period_days: number
          pnl_percent: number
          report_filename?: string | null
          report_path?: string | null
          source_filename: string
          source_path?: string | null
          started_at: string
          strategy_id: string
          tags?: string[]
          trade_count: number
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["backtest_sessions"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "backtest_sessions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_trades: {
        Row: {
          adverse_excursion: number
          adverse_excursion_percent: number
          created_at: string
          cumulative_pnl: number
          cumulative_pnl_percent: number
          duration_bars: number
          entry_at: string
          entry_price: number
          entry_signal: string
          exit_at: string
          exit_price: number
          exit_signal: string
          favorable_excursion: number
          favorable_excursion_percent: number
          id: number
          net_pnl: number
          position_value: number
          quantity: number
          return_percent: number
          session_id: string
          side: string
          trade_number: number
        }
        Insert: Omit<
          Database["public"]["Tables"]["backtest_trades"]["Row"],
          "created_at" | "id"
        > & { created_at?: string; id?: never }
        Update: Partial<
          Database["public"]["Tables"]["backtest_trades"]["Insert"]
        >
        Relationships: []
      }
      broker_accounts: {
        Row: {
          account_name: string | null
          balance: number | null
          created_at: string
          credential_secret_id: string
          currency: string | null
          equity: number | null
          id: string
          last_synced_at: string | null
          login: string
          provider: "metatrader5"
          server: string
          start_date: string
          status: "pending" | "connected" | "error"
          sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          balance?: number | null
          created_at?: string
          credential_secret_id: string
          currency?: string | null
          equity?: number | null
          id?: string
          last_synced_at?: string | null
          login: string
          provider: "metatrader5"
          server: string
          start_date?: string
          status?: "pending" | "connected" | "error"
          sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["broker_accounts"]["Insert"]>
        Relationships: []
      }
      broker_deals: {
        Row: {
          account_id: string
          comment: string
          commission: number
          created_at: string
          entry: number
          executed_at: string
          external_id: string
          fee: number
          magic: number
          price: number
          profit: number
          provider_deal_id: string
          provider_order_id: string | null
          provider_position_id: string | null
          raw: Json
          reason: number
          swap: number
          symbol: string
          time_msc: number
          type: number
          user_id: string
          volume: number
        }
        Insert: Omit<
          Database["public"]["Tables"]["broker_deals"]["Row"],
          "created_at"
        > & { created_at?: string }
        Update: Partial<Database["public"]["Tables"]["broker_deals"]["Insert"]>
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["strategies"]["Insert"]>
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      archive_backtest_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      create_backtest_session: {
        Args: {
          p_account_size?: number | null
          p_name: string
          p_pair: string
          p_session_id: string
          p_source_filename: string
          p_source_path: string
          p_strategy_id: string
          p_tags: string[]
          p_trades: Json
        }
        Returns: string
      }
      create_broker_account: {
        Args: {
          p_investor_password: string
          p_login: string
          p_provider: string
          p_server: string
          p_start_date: string
        }
        Returns: string
      }
      import_backtest_session: {
        Args: {
          p_account_size?: number | null
          p_metrics?: Json | null
          p_name: string
          p_pair: string
          p_report_filename?: string | null
          p_report_path?: string | null
          p_session_id: string
          p_source_filename: string
          p_source_path: string
          p_strategy_id: string
          p_tags: string[]
          p_trades: Json
        }
        Returns: string
      }
      update_backtest_session: {
        Args: {
          p_account_size: number | null
          p_metrics?: Json | null
          p_name: string
          p_pair: string
          p_report_filename?: string | null
          p_report_path?: string | null
          p_session_id: string
          p_strategy_id: string
          p_tags: string[]
        }
        Returns: undefined
      }
      worker_broker_accounts: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_id: string
          investor_password: string
          last_synced_at: string | null
          login: string
          provider: string
          server: string
          start_date: string
          user_id: string
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type BacktestSessionRow =
  Database["public"]["Tables"]["backtest_sessions"]["Row"]
export type BacktestSessionMetricRow =
  Database["public"]["Tables"]["backtest_session_metrics"]["Row"]
export type BacktestStrategyRow =
  Database["public"]["Tables"]["strategies"]["Row"]
export type BacktestTradeRow =
  Database["public"]["Tables"]["backtest_trades"]["Row"]
export type BrokerAccountRow = Omit<
  Database["public"]["Tables"]["broker_accounts"]["Row"],
  "credential_secret_id"
>
