"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Client, WorkModule, Task, Minute } from "@/lib/types";
import {
  MOCK_CLIENTS,
  MOCK_MODULES,
  MOCK_TASKS,
  MOCK_MINUTES,
  MOCK_USERS,
  MOCK_PASSWORDS,
} from "@/lib/mock-data";

export interface NewClientInput {
  name: string;
  industry: string;
  brand: "estrategia" | "sinbata";
  description: string;
  contact_email: string;
  proxima_reunion?: string;
}

export interface NewClientResult {
  client: Client;
  email: string;
  password: string;
}

interface DataContextType {
  clients: Client[];
  getClient: (id: string) => Client | undefined;
  getClientModules: (clientId: string) => WorkModule[];
  getClientTasks: (clientId: string) => Task[];
  getModuleTasks: (moduleId: string) => Task[];
  getClientMinutes: (clientId: string) => Minute[];
  toggleTask: (taskId: string) => void;
  addClient: (input: NewClientInput) => NewClientResult;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function firstWordSlug(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Token aleatorio criptográfico, letras/dígitos sin ambiguos (0/O/1/l/I).
function randomToken(len: number): string {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);

  const getClient = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  );

  const getClientModules = useCallback(
    (clientId: string) => MOCK_MODULES.filter((m) => m.client_id === clientId),
    []
  );

  const getClientTasks = useCallback(
    (clientId: string) => tasks.filter((t) => t.client_id === clientId),
    [tasks]
  );

  const getModuleTasks = useCallback(
    (moduleId: string) => tasks.filter((t) => t.module_id === moduleId),
    [tasks]
  );

  const getClientMinutes = useCallback(
    (clientId: string) => MOCK_MINUTES.filter((m) => m.client_id === clientId),
    []
  );

  const addClient = useCallback(
    (input: NewClientInput): NewClientResult => {
      const slug = slugify(input.name) || `cliente${Date.now()}`;
      const id = `client-${slug}`;
      const passwordSlug = firstWordSlug(input.name) || slug;
      const password = `${passwordSlug}-${randomToken(4)}-${randomToken(4)}`;
      const today = new Date().toISOString().split("T")[0];

      const client: Client = {
        id,
        name: input.name,
        industry: input.industry,
        brand: input.brand,
        color: input.brand === "estrategia" ? "#0D7C5F" : "#1B3A5C",
        health: "green",
        contact_name: input.name,
        contact_email: input.contact_email,
        created_at: today,
        proxima_reunion: input.proxima_reunion || undefined,
        description: input.description || undefined,
      };

      setClients((prev) => [...prev, client]);

      MOCK_USERS[input.contact_email] = {
        id: `user-${slug}`,
        email: input.contact_email,
        role: "client",
        full_name: input.name,
        client_id: id,
      };
      MOCK_PASSWORDS[input.contact_email] = password;

      return { client, email: input.contact_email, password };
    },
    []
  );

  const toggleTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completed_at: !t.completed
                ? new Date().toISOString().split("T")[0]
                : undefined,
            }
          : t
      )
    );
  }, []);

  return (
    <DataContext.Provider
      value={{
        clients,
        getClient,
        getClientModules,
        getClientTasks,
        getModuleTasks,
        getClientMinutes,
        toggleTask,
        addClient,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
