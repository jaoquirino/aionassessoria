import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Upload, X, Trash2 } from "lucide-react";
import {
  EditorialPost,
  useCreateEditorialPost,
  useUpdateEditorialPost,
  useDeleteEditorialPost,
  useUploadEditorialAttachment,
  useEditorialPostAttachments,
  useDeleteEditorialAttachment,
} from "@/hooks/useEditorialPosts";

interface EditorialPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: EditorialPost | null;
  clients: { id: string; name: string }[];
  teamMembers: { id: string; name: string }[];
  defaultDate?: Date;
}

const SOCIAL_NETWORKS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X / Twitter" },
];

const CONTENT_TYPES = [
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "reel", label: "Reel" },
  { value: "carousel", label: "Carrossel" },
  { value: "video", label: "Vídeo" },
];

const STATUSES = [
  { value: "planned", label: "Planejado" },
  { value: "approved", label: "Aprovado" },
  { value: "published", label: "Publicado" },
];

export function EditorialPostDialog({ open, onOpenChange, post, clients, teamMembers, defaultDate }: EditorialPostDialogProps) {
  const isEditing = !!post;
  const create = useCreateEditorialPost();
  const update = useUpdateEditorialPost();
  const deletePost = useDeleteEditorialPost();
  const uploadAttachment = useUploadEditorialAttachment();
  const deleteAttachment = useDeleteEditorialAttachment();
  const { data: attachments } = useEditorialPostAttachments(post?.id ?? null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [socialNetwork, setSocialNetwork] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("none");
  const [status, setStatus] = useState("planned");

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setClientId(post.client_id);
      setDate(new Date(post.scheduled_date + "T12:00:00"));
      setSocialNetwork(post.social_network);
      setContentType(post.content_type);
      setCaption(post.caption || "");
      setNotes(post.notes || "");
      setAssignedTo(post.assigned_to || "none");
      setStatus(post.status);
    } else {
      setTitle("");
      setClientId(clients[0]?.id || "");
      setDate(defaultDate);
      setSocialNetwork("instagram");
      setContentType("post");
      setCaption("");
      setNotes("");
      setAssignedTo("none");
      setStatus("planned");
    }
  }, [post, open, defaultDate, clients]);

  const isSaving = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!title || !clientId || !date) return;
    const input = {
      title,
      client_id: clientId,
      scheduled_date: date.toISOString().split("T")[0],
      social_network: socialNetwork,
      content_type: contentType,
      caption: caption || undefined,
      notes: notes || undefined,
      assigned_to: assignedTo === "none" ? undefined : assignedTo,
      status,
    };

    if (isEditing) {
      await update.mutateAsync({ id: post!.id, ...input });
    } else {
      await create.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    await deletePost.mutateAsync(post.id);
    onOpenChange(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!post || !e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      await uploadAttachment.mutateAsync({ postId: post.id, file });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Postagem" : "Nova Postagem"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da postagem" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <DatePicker date={date} onDateChange={setDate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rede Social</Label>
              <Select value={socialNetwork} onValueChange={setSocialNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOCIAL_NETWORKS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Conteúdo</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Legenda / Texto</Label>
            <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="Texto da postagem..." />
          </div>

          <div>
            <Label>Notas internas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas internas..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attachments - only for existing posts */}
          {isEditing && (
            <div>
              <Label>Arquivos (imagem/vídeo)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments?.map(att => (
                  <div key={att.id} className="relative group">
                    {att.file_type?.startsWith("image/") ? (
                      <img src={att.file_url} alt={att.file_name} className="h-20 w-20 object-cover rounded border border-border" />
                    ) : (
                      <div className="h-20 w-20 flex items-center justify-center rounded border border-border bg-muted text-xs text-muted-foreground p-1 text-center">
                        {att.file_name}
                      </div>
                    )}
                    <button
                      onClick={() => deleteAttachment.mutate(att.id)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <Upload className="h-4 w-4" />
                Enviar arquivo
                <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePost.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !title || !clientId || !date}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
