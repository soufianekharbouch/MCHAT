import * as SecureStore from 'expo-secure-store';

import type {
  CustomerDataResponse,
  Pet,
} from '../types/customer';


const API_URL =
  'https://animal-care2.kharbouch-soufiane.com/api/mobile';


/*
|--------------------------------------------------------------------------
| API ERROR
|--------------------------------------------------------------------------
*/

export class ApiError extends Error {

  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }

}


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type PetPayload = {

  name: string;

  species:
    | 'Cat'
    | 'Dog';

  breed_size_category?:
    | 'Small'
    | 'Medium'
    | 'Large'
    | null;

  age?:
    | string
    | null;

  health_status?:
    | string
    | null;

  note?:
    | string
    | null;

  photoUri?:
    | string
    | null;

};


type PetResponse = {

  success: boolean;

  message?: string;

  pet?: Pet;

};


type DeletePetResponse = {

  success: boolean;

  message?: string;

};


/*
|--------------------------------------------------------------------------
| ACCESS TOKEN
|--------------------------------------------------------------------------
*/

async function getAccessToken(): Promise<string> {

  const token =
    await SecureStore.getItemAsync(
      'access_token'
    );

  if (!token) {
    throw new ApiError(
      'Missing access token',
      401
    );
  }

  return token;

}


/*
|--------------------------------------------------------------------------
| READ JSON RESPONSE
|--------------------------------------------------------------------------
*/

async function readJson<T>(
  response: Response
): Promise<T> {

  try {

    return await response.json();

  } catch {

    throw new ApiError(
      'Invalid response from server',
      response.status
    );

  }

}


/*
|--------------------------------------------------------------------------
| CHECK RESPONSE
|--------------------------------------------------------------------------
*/

function checkResponse(
  response: Response,
  data: {
    success?: boolean;
    message?: string;
  },
  fallbackMessage: string
): void {

  if (
    !response.ok
    ||
    data.success !== true
  ) {

    throw new ApiError(
      data.message
        || fallbackMessage,
      response.status
    );

  }

}


/*
|--------------------------------------------------------------------------
| CUSTOMER DATA
|--------------------------------------------------------------------------
*/

export async function getCustomerData():
  Promise<CustomerDataResponse> {

  const token =
    await getAccessToken();


  const response =
    await fetch(
      `${API_URL}/data`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          access_token:
            token,
        }),
      }
    );


  const data =
    await readJson<CustomerDataResponse>(
      response
    );


  checkResponse(
    response,
    data,
    'Unable to load customer data'
  );


  return data;

}


/*
|--------------------------------------------------------------------------
| CUSTOMER SETTINGS
|--------------------------------------------------------------------------
*/

export type CustomerSettings = {
  language?: 'ar' | 'en';
  [key: string]: unknown;
};

export type CustomerAddress = {
  id: number;
  customer_account_id: number;
  label?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address: string;
  city: string;
  province?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
};

export type CustomerSettingsResponse = {
  customer: {
    id: number;
    phone?: string | null;
    email?: string | null;
  };
  settings: CustomerSettings;
  addresses: CustomerAddress[];
};

type SettingsUpdateResponse = {
  message?: string;
  settings?: CustomerSettings;
  language?: 'ar' | 'en';
  phone?: string | null;
  email?: string | null;
  address?: CustomerAddress;
  addresses?: CustomerAddress[];
};

export async function getCustomerSettings(): Promise<CustomerSettingsResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: token }),
  });

  const data = await readJson<CustomerSettingsResponse>(response);

  if (!response.ok) {
    throw new ApiError('Unable to load customer settings', response.status);
  }

  return data;
}

export async function updateCustomerSettings(
  settings: CustomerSettings
): Promise<SettingsUpdateResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/settings/update`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: token,
      settings,
    }),
  });

  const data = await readJson<SettingsUpdateResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Unable to update customer settings',
      response.status
    );
  }

  return data;
}

export async function updateCustomerLanguage(
  language: 'ar' | 'en'
): Promise<SettingsUpdateResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/settings/language`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: token,
      language,
    }),
  });

  const data = await readJson<SettingsUpdateResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Unable to update language',
      response.status
    );
  }

  return data;
}

export async function updateCustomerPhone(
  phone: string
): Promise<SettingsUpdateResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/settings/phone`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: token,
      phone,
    }),
  });

  const data = await readJson<SettingsUpdateResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Unable to update phone number',
      response.status
    );
  }

  return data;
}

export async function updateCustomerEmail(
  email: string | null
): Promise<SettingsUpdateResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/settings/email`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: token,
      email,
    }),
  });

  const data = await readJson<SettingsUpdateResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Unable to update email',
      response.status
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| CREATE PET
|--------------------------------------------------------------------------
*/

export async function createPet(
  payload: PetPayload
): Promise<PetResponse> {

  const token =
    await getAccessToken();


  const formData =
    createPetFormData(
      token,
      payload
    );


  const response =
    await fetch(
      `${API_URL}/pets`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',
        },

        body:
          formData,
      }
    );


  const data =
    await readJson<PetResponse>(
      response
    );


  checkResponse(
    response,
    data,
    'Unable to create pet'
  );


  return data;

}


/*
|--------------------------------------------------------------------------
| UPDATE PET
|--------------------------------------------------------------------------
*/

export async function updatePet(
  petId: number,
  payload: PetPayload
): Promise<PetResponse> {

  const token =
    await getAccessToken();


  const formData =
    createPetFormData(
      token,
      payload
    );


  const response =
    await fetch(
      `${API_URL}/pets/${petId}/update`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',
        },

        body:
          formData,
      }
    );


  const data =
    await readJson<PetResponse>(
      response
    );


  checkResponse(
    response,
    data,
    'Unable to update pet'
  );


  return data;

}


/*
|--------------------------------------------------------------------------
| UPDATE PET PHOTO
|--------------------------------------------------------------------------
*/

export async function updatePetPhoto(
  petId: number,
  photoUri: string
): Promise<PetResponse> {

  const token =
    await getAccessToken();


  const formData =
    new FormData();


  formData.append(
    'access_token',
    token
  );


  appendPhoto(
    formData,
    photoUri
  );


  const response =
    await fetch(
      `${API_URL}/pets/${petId}/photo`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',
        },

        body:
          formData,
      }
    );


  const data =
    await readJson<PetResponse>(
      response
    );


  checkResponse(
    response,
    data,
    'Unable to update pet photo'
  );


  return data;

}


/*
|--------------------------------------------------------------------------
| DELETE PET
|--------------------------------------------------------------------------
*/

export async function deletePet(
  petId: number
): Promise<DeletePetResponse> {

  const token =
    await getAccessToken();


  const response =
    await fetch(
      `${API_URL}/pets/${petId}/delete`,
      {
        method: 'POST',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          access_token:
            token,
        }),
      }
    );


  const data =
    await readJson<DeletePetResponse>(
      response
    );


  checkResponse(
    response,
    data,
    'Unable to delete pet'
  );


  return data;

}


/*
|--------------------------------------------------------------------------
| CREATE PET FORM DATA
|--------------------------------------------------------------------------
*/

function createPetFormData(
  token: string,
  payload: PetPayload
): FormData {

  const formData =
    new FormData();


  /*
  |--------------------------------------------------------------------------
  | AUTH
  |--------------------------------------------------------------------------
  */

  formData.append(
    'access_token',
    token
  );


  /*
  |--------------------------------------------------------------------------
  | REQUIRED VALUES
  |--------------------------------------------------------------------------
  */

  formData.append(
    'name',
    payload.name
  );


  formData.append(
    'species',
    payload.species
  );


  /*
  |--------------------------------------------------------------------------
  | BREED SIZE
  |--------------------------------------------------------------------------
  */

  if (
    payload.species === 'Dog'
    &&
    payload.breed_size_category
  ) {

    formData.append(
      'breed_size_category',
      payload.breed_size_category
    );

  }


  /*
  |--------------------------------------------------------------------------
  | AGE
  |--------------------------------------------------------------------------
  */

  if (
    payload.age !== null
    &&
    payload.age !== undefined
  ) {

    formData.append(
      'age',
      payload.age
    );

  } else {

    formData.append(
      'age',
      ''
    );

  }


  /*
  |--------------------------------------------------------------------------
  | HEALTH STATUS
  |--------------------------------------------------------------------------
  */

  if (
    payload.health_status !== null
    &&
    payload.health_status !== undefined
  ) {

    formData.append(
      'health_status',
      payload.health_status
    );

  } else {

    formData.append(
      'health_status',
      ''
    );

  }


  /*
  |--------------------------------------------------------------------------
  | NOTE
  |--------------------------------------------------------------------------
  */

  if (
    payload.note !== null
    &&
    payload.note !== undefined
  ) {

    formData.append(
      'note',
      payload.note
    );

  } else {

    formData.append(
      'note',
      ''
    );

  }


  /*
  |--------------------------------------------------------------------------
  | PHOTO
  |--------------------------------------------------------------------------
  */

  if (payload.photoUri) {

    appendPhoto(
      formData,
      payload.photoUri
    );

  }


  return formData;

}


/*
|--------------------------------------------------------------------------
| APPEND PHOTO TO FORM DATA
|--------------------------------------------------------------------------
*/

function appendPhoto(
  formData: FormData,
  photoUri: string
): void {

  const cleanUri =
    photoUri.split('?')[0];


  const extension =
    cleanUri
      .split('.')
      .pop()
      ?.toLowerCase();


  let mimeType =
    'image/jpeg';


  let fileExtension =
    'jpg';


  if (extension === 'png') {

    mimeType =
      'image/png';

    fileExtension =
      'png';

  } else if (
    extension === 'webp'
  ) {

    mimeType =
      'image/webp';

    fileExtension =
      'webp';

  } else if (
    extension === 'jpeg'
  ) {

    mimeType =
      'image/jpeg';

    fileExtension =
      'jpeg';

  }


  formData.append(
    'photo',
    {
      uri:
        photoUri,

      name:
        `pet-${Date.now()}.${fileExtension}`,

      type:
        mimeType,
    } as any
  );

}