export type UserRole = 'consumer' | 'hairdresser' | 'salon'

export interface Profile {
  id: string
  role: UserRole
  name: string
  avatar_url: string | null
  created_at: string
}

export interface MenuItem {
  name: string
  price: number
  duration: number // 所要時間（分）デフォルト60
  category?: string
  description?: string
}

export interface Hairdresser {
  id: string
  bio: string | null
  instagram_url: string | null
  area: string
  menus: MenuItem[] | null
  portfolio_urls: string[] | null
  profiles?: Profile
}

export interface Salon {
  id: string
  address: string
  area: string
  description: string | null
  price_per_hour: number
  equipment: string[] | null
  images: string[] | null
  lat: number | null
  lng: number | null
  profiles?: Profile
}

export interface Slot {
  id: string
  hairdresser_id: string | null
  salon_id: string | null
  date: string
  start_time: string
  end_time: string
  status: 'available' | 'reserved' | 'booked'
  created_at: string
}

export interface HairdresserSalon {
  id: string
  hairdresser_id: string
  salon_id: string
  status: 'active' | 'inactive'
  created_at: string
  salons?: Salon & { profiles?: Profile }
  hairdressers?: Hairdresser & { profiles?: Profile }
}

export interface HairdresserAvailability {
  id: string
  hairdresser_id: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

export interface SalonAvailability {
  id: string
  salon_id: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  hairdressers?: HairdresserAvailability & { profiles?: Profile }
}

export interface AvailableSlot {
  hairdresser_availability_id: string
  salon_availability_id: string
  hairdresser_id: string
  salon_id: string
  date: string
  available_from: string   // HH:MM:SS
  available_until: string  // HH:MM:SS
  hairdresser_salon_id: string
}

export interface Booking {
  id: string
  slot_id: string | null
  hairdresser_availability_id: string | null
  salon_availability_id: string | null
  salon_id: string | null
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  booked_date: string | null
  booked_start_time: string | null
  booked_end_time: string | null
  created_at: string
  slots?: Slot
  profiles?: Profile
  hairdressers?: Hairdresser & { profiles?: Profile }
  salons?: Salon & { profiles?: Profile }
}
