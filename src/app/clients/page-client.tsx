"use client";

import { useMemo, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { CreateClientDialog } from "@/components/CreateClientDialog";
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
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="shadow-md transition-shadow hover:shadow-lg"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        }
      />

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
                        <TableCell className="text-right">
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
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
