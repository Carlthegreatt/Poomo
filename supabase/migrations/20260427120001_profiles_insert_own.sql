-- Allow a signed-in user to create their own profile row if the auth trigger missed.

create policy profiles_insert_own on public.profiles for insert
with check (auth.uid() = id);
