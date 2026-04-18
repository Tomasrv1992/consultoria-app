-- Estrategia en Acción Console - Database Schema
-- Run this in your Supabase SQL editor

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consultant', 'client')),
  client_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Consultants can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'consultant'
    )
  );

-- Clients
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  brand TEXT NOT NULL CHECK (brand IN ('estrategia', 'sinbata')),
  color TEXT NOT NULL DEFAULT '#0D7C5F',
  health TEXT NOT NULL DEFAULT 'green' CHECK (health IN ('green', 'yellow', 'red')),
  logo_url TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants can read all clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'consultant'
    )
  );

CREATE POLICY "Clients can read own client"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = clients.id
    )
  );

-- Work modules
CREATE TABLE public.work_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ingresos', 'gestion', 'operaciones', 'mercadeo')),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.work_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules readable by consultant or own client"
  ON public.work_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'consultant' OR client_id = work_modules.client_id)
    )
  );

-- Tasks
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.work_modules(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks readable by consultant or own client"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'consultant' OR client_id = tasks.client_id)
    )
  );

CREATE POLICY "Tasks updatable by consultant or own client"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'consultant' OR client_id = tasks.client_id)
    )
  );

-- Minutes
CREATE TABLE public.minutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Minutes readable by consultant or own client"
  ON public.minutes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'consultant' OR client_id = minutes.client_id)
    )
  );

-- Minute sections
CREATE TABLE public.minute_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  minute_id UUID REFERENCES public.minutes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.minute_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Minute sections readable via minute access"
  ON public.minute_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.minutes m
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = minute_sections.minute_id
      AND (p.role = 'consultant' OR p.client_id = m.client_id)
    )
  );

-- Seed initial clients
INSERT INTO public.clients (name, industry, brand, color, health, contact_name, contact_email) VALUES
  ('CYGNUSS', 'Fitness', 'estrategia', '#0D7C5F', 'green', 'Carlos', 'contacto@cygnuss.com'),
  ('Dentilandia', 'Odontología', 'sinbata', '#1B3A5C', 'yellow', 'María', 'admin@dentilandia.com'),
  ('AC Autos', 'Autos', 'estrategia', '#0D7C5F', 'green', 'Andrés', 'info@acautos.com'),
  ('Paulina Zarrabe', 'Odontología', 'sinbata', '#1B3A5C', 'red', 'Paulina', 'paulina@zarrabe.com');
