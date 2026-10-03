/*
|--------------------------------------------------------------------------
| PET
|--------------------------------------------------------------------------
*/

export type Pet = {

  id: number;

  name: string;

  species:
    | 'Cat'
    | 'Dog'
    | string;

  breed_size_category?:
    | 'Small'
    | 'Medium'
    | 'Large'
    | null;

  age?:
    | string
    | number
    | null;

  health_status?:
    | string
    | null;

  note?:
    | string
    | null;

  /*
  |--------------------------------------------------------------------------
  | PHOTO
  |--------------------------------------------------------------------------
  */

  photo_url?:
    | string
    | null;

  /*
  |--------------------------------------------------------------------------
  | SUBSCRIPTION
  |--------------------------------------------------------------------------
  */

  transition?:
    boolean;

  subscription_start?:
    string
    | null;

  subscription_end?:
    string
    | null;

};


/*
|--------------------------------------------------------------------------
| RECIPE
|--------------------------------------------------------------------------
*/

export type Recipe = {

  id?: number;

  name?: string;

};


/*
|--------------------------------------------------------------------------
| ORDER ITEM
|--------------------------------------------------------------------------
*/

export type OrderItem = {

  id?: number;

  quantity?: number;

  recipe?:
    Recipe
    | null;

};


/*
|--------------------------------------------------------------------------
| ORDER ANIMAL
|--------------------------------------------------------------------------
*/

export type OrderAnimal = {

  id?: number;

  name?: string;

  species?: string;

  photo_url?:
    string
    | null;

};


/*
|--------------------------------------------------------------------------
| ORDER STATUS
|--------------------------------------------------------------------------
*/

export type OrderStatus =

  | 'planned'
  | 'prepared'
  | 'shipped'
  | 'delivered'
  | 'overdue';


/*
|--------------------------------------------------------------------------
| ORDER
|--------------------------------------------------------------------------
*/

export type Order = {

  id: number;

  scheduled_for?:
    string
    | null;

  status?:
    string
    | null;

  dashboard_status?:
    OrderStatus;

  prepared_at?:
    string
    | null;

  shipped_at?:
    string
    | null;

  delivered_at?:
    string
    | null;

  animal?:
    OrderAnimal
    | null;

  items?:
    OrderItem[];

};


/*
|--------------------------------------------------------------------------
| SUBSCRIPTION
|--------------------------------------------------------------------------
*/

export type Subscription = {

  id?: number;

  first_name?: string;

  last_name?: string;

  phone?: string;

  valid_loyalty_points?:
    number;

  animals?:
    Pet[];

  orders?:
    Order[];

};


/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
*/

export type Customer = {

  id?: number;

  name?: string;

  phone?: string;

  email?: string;

};


/*
|--------------------------------------------------------------------------
| CUSTOMER DATA API RESPONSE
|--------------------------------------------------------------------------
*/

export type CustomerDataResponse = {

  success: boolean;

  message?: string;

  customer?:
    Customer;

  subscription?:
    Subscription;

};


/*
|--------------------------------------------------------------------------
| PET API RESPONSE
|--------------------------------------------------------------------------
*/

export type PetResponse = {

  success: boolean;

  message?: string;

  pet?:
    Pet;

};


/*
|--------------------------------------------------------------------------
| DELETE PET API RESPONSE
|--------------------------------------------------------------------------
*/

export type DeletePetResponse = {

  success: boolean;

  message?: string;

};