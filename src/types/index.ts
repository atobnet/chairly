export type UserRole = 'consumer' | 'hairdresser' | 'salon'

export interface Profile {
  id: string
  role: UserRole
  name: string
  avatar_url: string | null
  gender?: string | null
  birth_year?: number | null
  created_at: string
}

export interface MenuItem {
  name: string
  price: number
  duration: number
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
  specialty_tags: string[] | null
  profiles?: Profile
}

export interface BusinessHourEntry {
  open: string
  close: string
  closed: boolean
}

export interface BusinessHours {
  mon?: BusinessHourEntry
  tue?: BusinessHourEntry
  wed?: BusinessHourEntry
  thu?: BusinessHourEntry
  fri?: BusinessHourEntry
  sat?: BusinessHourEntry
  sun?: BusinessHourEntry
}

export interface Salon {
  id: string
  address: string
  area: string
  description: string | null
  price_per_hour: number
  equipment: string[] | null
  images: string[] | null
  gallery_images: string[] | null
  business_hours: BusinessHours | null
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
  available_from: string
  available_until: string
  hairdresser_salon_id: string
}

export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  hairdresser_id: string
  rating: number
  comment: string | null
  menu_name: string | null
  visit_count: string | null
  created_at: string
  profiles?: Profile
}

export interface Favorite {
  id: string
  consumer_id: string
  hairdresser_id: string
  created_at: string
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

export interface StampCard {
  id: string
  hairdresser_id: string
  is_active: boolean
  stamps_required: number
  reward_description: string
  card_design: string
  created_at: string
}

export interface GuestStamp {
  id: string
  guest_id: string
  hairdresser_id: string
  stamp_count: number
  total_stamps: number
  created_at: string
  updated_at: string
}
