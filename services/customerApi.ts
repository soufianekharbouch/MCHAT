import * as SecureStore from "expo-secure-store";

import type { CustomerDataResponse } from "../types/customer";

const API_URL = "https://animal-care2.kharbouch-soufiane.com/api/mobile";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.status = status;
  }
}

export async function getCustomerData(): Promise<CustomerDataResponse> {
  const token = await SecureStore.getItemAsync("access_token");

  if (!token) {
    throw new ApiError("Missing access token", 401);
  }

  const response = await fetch(`${API_URL}/data`, {
    method: "POST",

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      access_token: token,
    }),
  });

  let data: CustomerDataResponse;

  try {
    data = await response.json();
  } catch {
    throw new ApiError("Invalid response from server", response.status);
  }

  if (!response.ok || data.success !== true) {
    throw new ApiError(
      data.message || "Unable to load customer data",
      response.status,
    );
  }

  return data;
}
