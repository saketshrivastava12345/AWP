// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: npm run db:types
//
// Produced by scripts/gen-types.mjs, which introspects the hosted Postgres
// schema directly. The Supabase CLI's own generator needs either Docker or a
// personal access token; this project uses neither.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      car_media: {
        Row: {
          id: string;
          variant_id: string | null;
          model_id: string | null;
          type: Database["public"]["Enums"]["media_type"];
          url: string;
          alt: string | null;
          is_primary: boolean;
          display_order: number;
          credit: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id?: string | null;
          model_id?: string | null;
          type: Database["public"]["Enums"]["media_type"];
          url: string;
          alt?: string | null;
          is_primary?: boolean;
          display_order?: number;
          credit?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string | null;
          model_id?: string | null;
          type?: Database["public"]["Enums"]["media_type"];
          url?: string;
          alt?: string | null;
          is_primary?: boolean;
          display_order?: number;
          credit?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "car_media_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "car_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_media_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      car_models: {
        Row: {
          id: string;
          manufacturer_id: string;
          category_id: string;
          name: string;
          slug: string;
          generation: string | null;
          body_type: Database["public"]["Enums"]["body_type"];
          description: string | null;
          production_start: number | null;
          production_end: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manufacturer_id: string;
          category_id: string;
          name: string;
          slug: string;
          generation?: string | null;
          body_type: Database["public"]["Enums"]["body_type"];
          description?: string | null;
          production_start?: number | null;
          production_end?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          manufacturer_id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          generation?: string | null;
          body_type?: Database["public"]["Enums"]["body_type"];
          description?: string | null;
          production_start?: number | null;
          production_end?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "car_models_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_models_manufacturer_id_fkey";
            columns: ["manufacturer_id"];
            isOneToOne: false;
            referencedRelation: "manufacturers";
            referencedColumns: ["id"];
          },
        ];
      };
      car_variants: {
        Row: {
          id: string;
          model_id: string;
          name: string;
          slug: string;
          year_start: number;
          year_end: number | null;
          base_price: number | null;
          price_currency: string | null;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          drive_type: Database["public"]["Enums"]["drive_type"];
          engine_id: string | null;
          transmission_id: string | null;
          description: string | null;
          source: string | null;
          notes: string | null;
          is_published: boolean;
          search_document: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model_id: string;
          name: string;
          slug: string;
          year_start: number;
          year_end?: number | null;
          base_price?: number | null;
          price_currency?: string | null;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          drive_type: Database["public"]["Enums"]["drive_type"];
          engine_id?: string | null;
          transmission_id?: string | null;
          description?: string | null;
          source?: string | null;
          notes?: string | null;
          is_published?: boolean;
          search_document?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          model_id?: string;
          name?: string;
          slug?: string;
          year_start?: number;
          year_end?: number | null;
          base_price?: number | null;
          price_currency?: string | null;
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          drive_type?: Database["public"]["Enums"]["drive_type"];
          engine_id?: string | null;
          transmission_id?: string | null;
          description?: string | null;
          source?: string | null;
          notes?: string | null;
          is_published?: boolean;
          search_document?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "car_variants_engine_id_fkey";
            columns: ["engine_id"];
            isOneToOne: false;
            referencedRelation: "engines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_variants_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "car_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_variants_transmission_id_fkey";
            columns: ["transmission_id"];
            isOneToOne: false;
            referencedRelation: "transmissions";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          display_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          display_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          display_order?: number;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          id: string;
          name: string;
          slug: string;
          iso_code: string;
          flag_emoji: string | null;
          description: string | null;
          automotive_history: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          iso_code: string;
          flag_emoji?: string | null;
          description?: string | null;
          automotive_history?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          iso_code?: string;
          flag_emoji?: string | null;
          description?: string | null;
          automotive_history?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dimensions: {
        Row: {
          variant_id: string;
          length_mm: number | null;
          width_mm: number | null;
          height_mm: number | null;
          wheelbase_mm: number | null;
          kerb_weight_kg: number | null;
          ground_clearance_mm: number | null;
          boot_capacity_l: number | null;
          seating_capacity: number | null;
          source: string | null;
          notes: string | null;
        };
        Insert: {
          variant_id: string;
          length_mm?: number | null;
          width_mm?: number | null;
          height_mm?: number | null;
          wheelbase_mm?: number | null;
          kerb_weight_kg?: number | null;
          ground_clearance_mm?: number | null;
          boot_capacity_l?: number | null;
          seating_capacity?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Update: {
          variant_id?: string;
          length_mm?: number | null;
          width_mm?: number | null;
          height_mm?: number | null;
          wheelbase_mm?: number | null;
          kerb_weight_kg?: number | null;
          ground_clearance_mm?: number | null;
          boot_capacity_l?: number | null;
          seating_capacity?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dimensions_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      engines: {
        Row: {
          id: string;
          name: string;
          layout: Database["public"]["Enums"]["engine_layout"];
          cylinders: number | null;
          displacement_cc: number | null;
          aspiration: Database["public"]["Enums"]["aspiration"];
          fuel_system: string | null;
          compression_ratio: number | null;
          redline_rpm: number | null;
          cooling: string | null;
          valves_per_cylinder: number | null;
          notes: string | null;
          source: string | null;
          configuration: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          layout: Database["public"]["Enums"]["engine_layout"];
          cylinders?: number | null;
          displacement_cc?: number | null;
          aspiration?: Database["public"]["Enums"]["aspiration"];
          fuel_system?: string | null;
          compression_ratio?: number | null;
          redline_rpm?: number | null;
          cooling?: string | null;
          valves_per_cylinder?: number | null;
          notes?: string | null;
          source?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          layout?: Database["public"]["Enums"]["engine_layout"];
          cylinders?: number | null;
          displacement_cc?: number | null;
          aspiration?: Database["public"]["Enums"]["aspiration"];
          fuel_system?: string | null;
          compression_ratio?: number | null;
          redline_rpm?: number | null;
          cooling?: string | null;
          valves_per_cylinder?: number | null;
          notes?: string | null;
          source?: string | null;
        };
        Relationships: [];
      };
      ev_specs: {
        Row: {
          variant_id: string;
          battery_kwh: number | null;
          usable_battery_kwh: number | null;
          range_km: number | null;
          range_standard: Database["public"]["Enums"]["range_standard"] | null;
          max_charge_kw: number | null;
          charge_10_80_min: number | null;
          motor_count: number | null;
          source: string | null;
          notes: string | null;
        };
        Insert: {
          variant_id: string;
          battery_kwh?: number | null;
          usable_battery_kwh?: number | null;
          range_km?: number | null;
          range_standard?: Database["public"]["Enums"]["range_standard"] | null;
          max_charge_kw?: number | null;
          charge_10_80_min?: number | null;
          motor_count?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Update: {
          variant_id?: string;
          battery_kwh?: number | null;
          usable_battery_kwh?: number | null;
          range_km?: number | null;
          range_standard?: Database["public"]["Enums"]["range_standard"] | null;
          max_charge_kw?: number | null;
          charge_10_80_min?: number | null;
          motor_count?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ev_specs_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          variant_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          variant_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          variant_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      features: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string | null;
          description: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          category?: string | null;
          description?: string | null;
        };
        Relationships: [];
      };
      fuel_specs: {
        Row: {
          variant_id: string;
          tank_capacity_l: number | null;
          mileage_kmpl: number | null;
          co2_g_km: number | null;
          emission_standard: string | null;
          source: string | null;
          notes: string | null;
        };
        Insert: {
          variant_id: string;
          tank_capacity_l?: number | null;
          mileage_kmpl?: number | null;
          co2_g_km?: number | null;
          emission_standard?: string | null;
          source?: string | null;
          notes?: string | null;
        };
        Update: {
          variant_id?: string;
          tank_capacity_l?: number | null;
          mileage_kmpl?: number | null;
          co2_g_km?: number | null;
          emission_standard?: string | null;
          source?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fuel_specs_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      manufacturers: {
        Row: {
          id: string;
          country_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          founded_year: number | null;
          headquarters: string | null;
          description: string | null;
          segment: Database["public"]["Enums"]["manufacturer_segment"];
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          country_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          founded_year?: number | null;
          headquarters?: string | null;
          description?: string | null;
          segment?: Database["public"]["Enums"]["manufacturer_segment"];
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          country_id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          founded_year?: number | null;
          headquarters?: string | null;
          description?: string | null;
          segment?: Database["public"]["Enums"]["manufacturer_segment"];
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manufacturers_country_id_fkey";
            columns: ["country_id"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["id"];
          },
        ];
      };
      part_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          display_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          display_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          display_order?: number;
        };
        Relationships: [];
      };
      part_relations: {
        Row: {
          part_id: string;
          related_part_id: string;
        };
        Insert: {
          part_id: string;
          related_part_id: string;
        };
        Update: {
          part_id?: string;
          related_part_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_relations_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_relations_related_part_id_fkey";
            columns: ["related_part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
        ];
      };
      parts: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          function: string | null;
          typical_materials: string | null;
          location: string | null;
          common_failure_points: string | null;
          performance_impact: string | null;
          image_url: string | null;
          viewer_group: Database["public"]["Enums"]["viewer_group"] | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          function?: string | null;
          typical_materials?: string | null;
          location?: string | null;
          common_failure_points?: string | null;
          performance_impact?: string | null;
          image_url?: string | null;
          viewer_group?: Database["public"]["Enums"]["viewer_group"] | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          function?: string | null;
          typical_materials?: string | null;
          location?: string | null;
          common_failure_points?: string | null;
          performance_impact?: string | null;
          image_url?: string | null;
          viewer_group?: Database["public"]["Enums"]["viewer_group"] | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "part_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      performance_specs: {
        Row: {
          variant_id: string;
          power_hp: number | null;
          power_rpm: number | null;
          torque_nm: number | null;
          torque_rpm: number | null;
          top_speed_kmh: number | null;
          zero_to_100_s: number | null;
          zero_to_200_s: number | null;
          quarter_mile_s: number | null;
          braking_100_0_m: number | null;
          source: string | null;
          notes: string | null;
        };
        Insert: {
          variant_id: string;
          power_hp?: number | null;
          power_rpm?: number | null;
          torque_nm?: number | null;
          torque_rpm?: number | null;
          top_speed_kmh?: number | null;
          zero_to_100_s?: number | null;
          zero_to_200_s?: number | null;
          quarter_mile_s?: number | null;
          braking_100_0_m?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Update: {
          variant_id?: string;
          power_hp?: number | null;
          power_rpm?: number | null;
          torque_nm?: number | null;
          torque_rpm?: number | null;
          top_speed_kmh?: number | null;
          zero_to_100_s?: number | null;
          zero_to_200_s?: number | null;
          quarter_mile_s?: number | null;
          braking_100_0_m?: number | null;
          source?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "performance_specs_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transmissions: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["transmission_type"];
          gears: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["transmission_type"];
          gears?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["transmission_type"];
          gears?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      variant_features: {
        Row: {
          variant_id: string;
          feature_id: string;
          detail: string | null;
        };
        Insert: {
          variant_id: string;
          feature_id: string;
          detail?: string | null;
        };
        Update: {
          variant_id?: string;
          feature_id?: string;
          detail?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_features_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_features_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_parts: {
        Row: {
          variant_id: string;
          part_id: string;
          detail: string | null;
        };
        Insert: {
          variant_id: string;
          part_id: string;
          detail?: string | null;
        };
        Update: {
          variant_id?: string;
          part_id?: string;
          detail?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_parts_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "car_variants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      car_catalog: {
        Row: {
          variant_id: string | null;
          variant_slug: string | null;
          variant_name: string | null;
          year_start: number | null;
          year_end: number | null;
          base_price: number | null;
          price_currency: string | null;
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null;
          drive_type: Database["public"]["Enums"]["drive_type"] | null;
          variant_description: string | null;
          is_published: boolean | null;
          search_document: unknown | null;
          model_id: string | null;
          model_slug: string | null;
          model_name: string | null;
          generation: string | null;
          body_type: Database["public"]["Enums"]["body_type"] | null;
          manufacturer_id: string | null;
          manufacturer_slug: string | null;
          manufacturer_name: string | null;
          manufacturer_logo_url: string | null;
          manufacturer_segment: Database["public"]["Enums"]["manufacturer_segment"] | null;
          country_id: string | null;
          country_slug: string | null;
          country_name: string | null;
          country_flag_emoji: string | null;
          category_id: string | null;
          category_slug: string | null;
          category_name: string | null;
          power_hp: number | null;
          torque_nm: number | null;
          top_speed_kmh: number | null;
          zero_to_100_s: number | null;
          kerb_weight_kg: number | null;
          length_mm: number | null;
          engine_id: string | null;
          engine_name: string | null;
          engine_layout: Database["public"]["Enums"]["engine_layout"] | null;
          engine_cylinders: number | null;
          displacement_cc: number | null;
          aspiration: Database["public"]["Enums"]["aspiration"] | null;
          engine_configuration: string | null;
          transmission_id: string | null;
          transmission_name: string | null;
          transmission_type: Database["public"]["Enums"]["transmission_type"] | null;
          transmission_gears: number | null;
          battery_kwh: number | null;
          range_km: number | null;
          range_standard: Database["public"]["Enums"]["range_standard"] | null;
          mileage_kmpl: number | null;
          power_to_weight_hp_per_tonne: number | null;
          primary_image_url: string | null;
          has_glb: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      aspiration: "naturally_aspirated" | "turbocharged" | "twin_turbo" | "supercharged" | "twincharged";
      body_type: "hatchback" | "sedan" | "coupe" | "convertible" | "roadster" | "suv" | "wagon" | "mpv" | "pickup" | "off_road";
      drive_type: "fwd" | "rwd" | "awd" | "4wd";
      engine_layout: "inline" | "vee" | "flat" | "w" | "rotary";
      fuel_type: "petrol" | "diesel" | "hybrid" | "phev" | "electric" | "hydrogen";
      manufacturer_segment: "luxury" | "performance" | "mass" | "ev" | "commercial";
      media_type: "image" | "glb";
      range_standard: "wltp" | "epa" | "arai" | "nedc" | "cltc";
      transmission_type: "manual" | "automatic" | "dct" | "amt" | "cvt" | "single_speed";
      user_role: "user" | "admin";
      viewer_group: "body" | "engine" | "transmission" | "suspension" | "brakes" | "wheels" | "interior" | "electronics" | "battery";
    };
    CompositeTypes: Record<PropertyKey, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
