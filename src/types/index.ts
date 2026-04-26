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

export interface Booking {
  id: string
  slot_id: string
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  slots?: Slot
  profiles?: Profile
  hairdressers?: Hairdresser & { profiles?: Profile }
}
