"use server";

import { redirect } from "next/navigation";

export async function login() {
  redirect("/");
}

export async function logout() {
  redirect("/");
}

export async function register() {
  redirect("/register");
}
