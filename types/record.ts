export interface Record {
  id: number; // Or string, depending on API response
  title: string;
  price: number;
  quantity: number;
  status: string; // Added: Status field from API
  catalogNumber?: string; // Added: Optional catalog number
  condition?: string;
  coverImage?: string; // Changed to camelCase
  artist?: string;
  // format?: string;
  format?: string | string[]; // Updated: Format can be string or array
  label?: string;
  weight?: number; // Added: Optional weight for cart/shipping
  // Add any other fields returned by the external API's /api/records endpoint that the frontend needs
} 