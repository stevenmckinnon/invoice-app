"use client";

import { useEffect, useMemo, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";

import { type Client } from "@/components/ClientSelector";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Motion variants and per-row transition
  const rowVariants = useMemo(
    () => ({
      hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
      show: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
      exit: prefersReducedMotion
        ? { opacity: 0 }
        : { opacity: 0, y: -4, transition: { duration: 0.18 } },
    }),
    [prefersReducedMotion],
  );

  const getRowTransition = (index: number) =>
    prefersReducedMotion
      ? { duration: 0 }
      : ({
          type: "spring" as const,
          stiffness: 380,
          damping: 30,
          mass: 0.3,
          delay: 0.04 + index * 0.06,
        } as const);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        alert(err.error ?? "Failed to delete client");
        return;
      }

      setClients(clients.filter((c) => c.id !== id));
    } catch {
      alert("Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClientCreated = (client: Client) => {
    setClients([client, ...clients]);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 pb-28 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your client database</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            A list of all your clients with their details and rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Day Rate</TableHead>
                    <TableHead>Per Diem Work</TableHead>
                    <TableHead>Per Diem Travel</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No clients found.</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Day Rate</TableHead>
                    <TableHead>Per Diem Work</TableHead>
                    <TableHead>Per Diem Travel</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {clients.map((client, idx) => (
                      <motion.tr
                        key={client.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={getRowTransition(idx)}
                        className="hover:bg-muted/40 border-b transition-colors"
                      >
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{client.city || "-"}</TableCell>
                        <TableCell>{client.country || "-"}</TableCell>
                        <TableCell>
                          {client.dayRate
                            ? `£${Number(client.dayRate).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {client.perDiemWork
                            ? `£${Number(client.perDiemWork).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {client.perDiemTravel
                            ? `£${Number(client.perDiemTravel).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <motion.button
                              type="button"
                              whileHover={
                                prefersReducedMotion
                                  ? undefined
                                  : { scale: 1.05 }
                              }
                              whileTap={
                                prefersReducedMotion
                                  ? undefined
                                  : { scale: 0.97 }
                              }
                              className="hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-md"
                              onClick={() =>
                                router.push(`/clients/${client.id}/edit`)
                              }
                              aria-label="Edit client"
                            >
                              <Pencil className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              type="button"
                              whileHover={
                                prefersReducedMotion
                                  ? undefined
                                  : { scale: 1.05 }
                              }
                              whileTap={
                                prefersReducedMotion
                                  ? undefined
                                  : { scale: 0.97 }
                              }
                              className="hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-md"
                              onClick={() => handleDelete(client.id)}
                              disabled={deletingId === client.id}
                              aria-label="Delete client"
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                            </motion.button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}
