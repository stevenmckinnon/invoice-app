"use client";

import { useMemo, useState } from "react";

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
import {
  useClients,
  useCreateClient,
  useDeleteClient,
} from "@/hooks/use-clients";

export default function ClientsPage() {
  const router = useRouter();
  const { data: clients = [], isLoading: loading, error } = useClients();
  const deleteClientMutation = useDeleteClient();
  const createClientMutation = useCreateClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) {
      return;
    }

    deleteClientMutation.mutate(id);
  };

  const handleClientCreated = (client: Client) => {
    // The mutation will automatically invalidate and refetch clients
    // But we can optimistically update the UI if needed
    setShowCreateDialog(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 py-10 md:pb-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="font-oswald text-4xl font-bold tracking-tight">
            Clients
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage your client database
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="shadow-md transition-shadow hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All Clients</CardTitle>
          <CardDescription className="font-medium">
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
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm font-medium">
                No clients found.
              </p>
              <Button
                className="mt-6 shadow-md transition-shadow hover:shadow-lg"
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
                              disabled={deleteClientMutation.isPending}
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
