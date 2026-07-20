"use client";

import { useMemo, useState } from "react";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CreateClientDialog } from "@/components/CreateClientDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useClients,
  useCreateClient,
  useDeleteClient,
} from "@/hooks/use-clients";
import { formatCurrency } from "@/lib/utils";

export default function ClientsPage() {
  const router = useRouter();
  const { data: clients = [], isLoading: loading } = useClients();
  const deleteClientMutation = useDeleteClient();
  const createClientMutation = useCreateClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
          // Cap the stagger so long client lists don't take seconds to appear
          delay: 0.04 + Math.min(index, 8) * 0.06,
        } as const);

  const handleConfirmDelete = () => {
    if (!clientToDelete) return;
    deleteClientMutation.mutate(clientToDelete.id, {
      onSettled: () => setClientToDelete(null),
    });
  };

  const handleClientCreated = () => {
    setShowCreateDialog(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 py-10 md:pb-8">
      <PageHeader
        title="Clients"
        subtitle="Store client details to pre-fill invoices faster"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus />
            Add Client
          </Button>
        }
      />

      <Card>
        <CardContent>
          {loading ? (
            <>
              {/* Desktop skeleton */}
              <div className="hidden overflow-x-auto md:block">
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
              {/* Mobile skeleton */}
              <div className="flex flex-col gap-3 md:hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            </>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add a client to pre-fill their details on invoices."
              action={
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus />
                  Add Client
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop table — whole row opens the client */}
              <div className="hidden overflow-x-auto md:block">
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
                          onClick={() =>
                            router.push(`/clients/${client.id}/edit`)
                          }
                          className="hover:bg-muted/40 cursor-pointer border-b transition-colors"
                        >
                          <TableCell className="font-medium">
                            <Link
                              href={`/clients/${client.id}/edit`}
                              transitionTypes={["forward"]}
                              onClick={(e) => e.stopPropagation()}
                              className="focus-visible:ring-ring rounded-sm outline-none hover:underline focus-visible:ring-2"
                            >
                              {client.name}
                            </Link>
                          </TableCell>
                          <TableCell>{client.city || "-"}</TableCell>
                          <TableCell>{client.country || "-"}</TableCell>
                          <TableCell>
                            {client.dayRate
                              ? formatCurrency(Number(client.dayRate))
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {client.perDiemWork
                              ? formatCurrency(Number(client.perDiemWork))
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {client.perDiemTravel
                              ? formatCurrency(Number(client.perDiemTravel))
                              : "-"}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild variant="outline" size="sm">
                                    <Link
                                      href={`/clients/${client.id}/edit`}
                                      transitionTypes={["forward"]}
                                      aria-label="Edit client"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit client</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setClientToDelete({
                                        id: client.id,
                                        name: client.name,
                                      })
                                    }
                                    disabled={deleteClientMutation.isPending}
                                    aria-label="Delete client"
                                  >
                                    <Trash2 className="text-destructive h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete client</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}/edit`)}
                    className="hover:bg-muted/40 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/clients/${client.id}/edit`}
                        transitionTypes={["forward"]}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientToDelete({
                            id: client.id,
                            name: client.name,
                          });
                        }}
                        disabled={deleteClientMutation.isPending}
                        aria-label="Delete client"
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {[client.city, client.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>
                        <span className="text-muted-foreground">Day </span>
                        {client.dayRate
                          ? formatCurrency(Number(client.dayRate))
                          : "—"}
                      </span>
                      <span>
                        <span className="text-muted-foreground">
                          Per diem (work){" "}
                        </span>
                        {client.perDiemWork
                          ? formatCurrency(Number(client.perDiemWork))
                          : "—"}
                      </span>
                      <span>
                        <span className="text-muted-foreground">
                          Per diem (travel){" "}
                        </span>
                        {client.perDiemTravel
                          ? formatCurrency(Number(client.perDiemTravel))
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onClientCreated={handleClientCreated}
      />

      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              {clientToDelete ? `"${clientToDelete.name}"` : "this client"}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while the mutation runs
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleteClientMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
