"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Shield, ShoppingCart, UtensilsCrossed, Beer } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Role = "ADMIN" | "CAJERO" | "MESERO" | "BARTENDER";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  activo: boolean;
  createdAt: string;
}

const roleConfig: Record<Role, { label: string; icon: React.ElementType; color: string }> = {
  ADMIN: { label: "Administrador", icon: Shield, color: "text-purple-600" },
  CAJERO: { label: "Cajero", icon: ShoppingCart, color: "text-blue-600" },
  MESERO: { label: "Mesero", icon: UtensilsCrossed, color: "text-emerald-600" },
  BARTENDER: { label: "Bartender", icon: Beer, color: "text-amber-600" },
};

export function UsuariosView({ usuarios: initial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", nombre: "", role: "MESERO", password: "" });

  async function fetchUsuarios() {
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
  }

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Usuario creado correctamente");
      setShowCreate(false);
      setForm({ email: "", nombre: "", role: "MESERO", password: "" });
      fetchUsuarios();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear usuario");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {(Object.keys(roleConfig) as Role[]).map((role) => (
            <Badge key={role} variant="outline" className={roleConfig[role].color}>
              {usuarios.filter((u) => u.role === role).length} {roleConfig[role].label}s
            </Badge>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const rc = roleConfig[u.role];
              const RoleIcon = rc.icon;
              return (
                <TableRow key={u.id} className={!u.activo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-2 ${rc.color}`}>
                      <RoleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{rc.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "default" : "secondary"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Contraseña *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="CAJERO">Cajero</SelectItem>
                  <SelectItem value="MESERO">Mesero</SelectItem>
                  <SelectItem value="BARTENDER">Bartender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading || !form.email || !form.nombre || !form.password}>
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
