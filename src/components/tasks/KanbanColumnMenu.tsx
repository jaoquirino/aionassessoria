 import { useState } from "react";
 import { MoreVertical, Pencil, Trash2, Plus, GripVertical } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
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
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import type { KanbanColumn } from "@/hooks/useKanbanColumns";
 
 interface KanbanColumnMenuProps {
   column: KanbanColumn;
   onEdit: (id: string, label: string, colorClass: string) => void;
   onDelete: (id: string) => void;
   onAddAfter: (afterIndex: number) => void;
 }
 
 const colorOptions = [
   { value: "bg-muted/50 border-muted-foreground/20", label: "Cinza" },
   { value: "bg-primary/10 border-primary/30", label: "Azul" },
   { value: "bg-success/10 border-success/30", label: "Verde" },
   { value: "bg-warning/10 border-warning/30", label: "Amarelo" },
   { value: "bg-info/10 border-info/30", label: "Ciano" },
   { value: "bg-destructive/10 border-destructive/30", label: "Vermelho" },
   { value: "bg-purple-500/10 border-purple-500/30", label: "Roxo" },
   { value: "bg-orange-500/10 border-orange-500/30", label: "Laranja" },
 ];
 
 export function KanbanColumnMenu({ column, onEdit, onDelete, onAddAfter }: KanbanColumnMenuProps) {
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [label, setLabel] = useState(column.label);
   const [colorClass, setColorClass] = useState(column.color_class);
 
   const handleEdit = () => {
     onEdit(column.id, label, colorClass);
     setEditOpen(false);
   };
 
   const handleDelete = () => {
     onDelete(column.id);
     setDeleteOpen(false);
   };
 
   return (
     <>
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/50 transition-colors">
             <MoreVertical className="h-4 w-4 text-muted-foreground" />
           </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-48">
           <DropdownMenuItem onClick={() => setEditOpen(true)}>
             <Pencil className="h-4 w-4 mr-2" />
             Editar coluna
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => onAddAfter(column.order_index)}>
             <Plus className="h-4 w-4 mr-2" />
             Adicionar coluna após
           </DropdownMenuItem>
           {!column.is_protected && (
             <>
               <DropdownMenuSeparator />
               <DropdownMenuItem 
                 onClick={() => setDeleteOpen(true)}
                 className="text-destructive focus:text-destructive"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Remover coluna
               </DropdownMenuItem>
             </>
           )}
         </DropdownMenuContent>
       </DropdownMenu>
 
       {/* Edit Dialog */}
       <Dialog open={editOpen} onOpenChange={setEditOpen}>
         <DialogContent className="sm:max-w-[400px]">
           <DialogHeader>
             <DialogTitle>Editar Coluna</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Nome da coluna</Label>
               <Input 
                 value={label} 
                 onChange={(e) => setLabel(e.target.value)} 
                 placeholder="Nome da coluna"
               />
             </div>
             <div className="space-y-2">
               <Label>Cor</Label>
               <Select value={colorClass} onValueChange={setColorClass}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {colorOptions.map(opt => (
                     <SelectItem key={opt.value} value={opt.value}>
                       <div className="flex items-center gap-2">
                         <div className={`w-4 h-4 rounded border-2 ${opt.value}`} />
                         {opt.label}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
             <Button onClick={handleEdit}>Salvar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Delete Confirmation */}
       <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Remover coluna?</AlertDialogTitle>
             <AlertDialogDescription>
               Esta ação não pode ser desfeita. As tarefas nesta coluna serão movidas para "A fazer".
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
               Remover
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }
 
 // Dialog for adding new column
 interface AddColumnDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onAdd: (label: string, colorClass: string) => void;
 }
 
 export function AddColumnDialog({ open, onOpenChange, onAdd }: AddColumnDialogProps) {
   const [label, setLabel] = useState("");
   const [colorClass, setColorClass] = useState("bg-muted/50 border-muted-foreground/20");
 
   const handleAdd = () => {
     if (label.trim()) {
       onAdd(label.trim(), colorClass);
       setLabel("");
       setColorClass("bg-muted/50 border-muted-foreground/20");
       onOpenChange(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-[400px]">
         <DialogHeader>
           <DialogTitle>Nova Coluna</DialogTitle>
         </DialogHeader>
         <div className="space-y-4 py-4">
           <div className="space-y-2">
             <Label>Nome da coluna</Label>
             <Input 
               value={label} 
               onChange={(e) => setLabel(e.target.value)} 
               placeholder="Ex: Em aprovação"
             />
           </div>
           <div className="space-y-2">
             <Label>Cor</Label>
             <Select value={colorClass} onValueChange={setColorClass}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {colorOptions.map(opt => (
                   <SelectItem key={opt.value} value={opt.value}>
                     <div className="flex items-center gap-2">
                       <div className={`w-4 h-4 rounded border-2 ${opt.value}`} />
                       {opt.label}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </div>
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
           <Button onClick={handleAdd} disabled={!label.trim()}>Criar</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }