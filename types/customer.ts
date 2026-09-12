export type Pet = {
  id: number;
  name: string;
  species: string;
  breed_size_category?: string | null;
  age?: string | number | null;
  health_status?: string | null;
  note?: string | null;
};

export type Recipe = {
  id?: number;
  name?: string;
};

export type OrderItem = {
  id?: number;
  quantity?: number;
  recipe?: Recipe | null;
};

export type OrderAnimal = {
  id?: number;
  name?: string;
  species?: string;
};

export type OrderStatus =
  | 'planned'
  | 'prepared'
  | 'shipped'
  | 'delivered'
  | 'overdue';

export type Order = {
  id: number;

  scheduled_for?: string | null;

  dashboard_status?: OrderStatus;

  prepared_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;

  animal?: OrderAnimal | null;

  items?: OrderItem[];
};

export type Subscription = {
  id?: number;

  first_name?: string;
  last_name?: string;

  phone?: string;

  valid_loyalty_points?: number;

  animals?: Pet[];

  orders?: Order[];
};

export type Customer = {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
};

export type CustomerDataResponse = {
  success: boolean;

  message?: string;

  customer?: Customer;

  subscription?: Subscription;
};