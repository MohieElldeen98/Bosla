"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { createArticleSeriesAction, deleteArticleSeriesAction, updateArticleSeriesAction } from "@/blog/actions/article-series.actions";
import { slugSchema } from "@/blog/validators/shared";
import type { ArticleSeries } from "@/blog/types/article-series";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";

const schema = z.object({ title: z.string().trim().min(1), slug: slugSchema, description: z.string(), isActive: z.boolean(), displayOrder: z.number().int().min(0) });
type Values = z.infer<typeof schema>;
const empty = (): Values => ({ title: "", slug: "", description: "", isActive: true, displayOrder: 0 });
export function ArticleSeriesManager({ series }: { series: ArticleSeries[] }) {
  const t = useTranslations("Admin.articleSeries"); const locale = useLocale() as "en" | "ar"; const router = useRouter();
  const [editing, setEditing] = useState<ArticleSeries | "new" | null>(null); const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty() });
  const open = (item: ArticleSeries | "new") => { setEditing(item); setError(null); reset(item === "new" ? empty() : { title: item.title[locale], slug: item.slug, description: item.description?.[locale] ?? "", isActive: item.isActive, displayOrder: item.displayOrder }); };
  async function submit(values: Values) { setError(null); const payload = { slug: values.slug, title: { en: values.title, ar: values.title }, description: values.description.trim() ? { en: values.description, ar: values.description } : undefined, isActive: values.isActive, displayOrder: values.displayOrder }; const result = editing === "new" ? await createArticleSeriesAction(payload) : await updateArticleSeriesAction(editing!.id, payload); if (!result.success) { setError(result.message); toast.error(result.message); return; } toast.success(editing === "new" ? t("toasts.created") : t("toasts.updated")); setEditing(null); router.refresh(); }
  async function remove(item: ArticleSeries) { if (!window.confirm(t("confirm.delete", { name: resolveLocalizedText(item.title, locale) }))) return; const result = await deleteArticleSeriesAction(item.id); if (result.success) { toast.success(t("toasts.deleted")); router.refresh(); } else toast.error(result.message); }
  return <div className="space-y-4">{editing === null ? <div className="flex justify-end"><Button size="sm" onClick={() => open("new")}><Plus />{t("createSeries")}</Button></div> : <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">{editing === "new" ? t("createSeries") : t("editSeries")}</h2><div><Label htmlFor="series-title">{t("fields.title")}</Label><Input id="series-title" {...register("title")} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div><div><Label htmlFor="series-slug">{t("fields.slug")}</Label><Input id="series-slug" {...register("slug")} /></div><div><Label htmlFor="series-description">{t("fields.description")}</Label><Textarea id="series-description" {...register("description")} /></div><NumberField id="series-order" label={t("fields.displayOrder")} name="displayOrder" register={register} errors={errors} step="1" /><CheckboxField id="series-active" label={t("fields.isActive")} name="isActive" control={control} /><p className="text-sm text-destructive">{error}</p><div className="flex gap-2"><Button type="submit" disabled={isSubmitting}>{t("save")}</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button></div></form>}<div className="rounded-2xl border border-border bg-card">{series.length === 0 ? <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /> : <Table><TableHeader><TableRow><TableHead>{t("columns.title")}</TableHead><TableHead>{t("columns.slug")}</TableHead><TableHead>{t("columns.order")}</TableHead><TableHead>{t("columns.active")}</TableHead><TableHead /></TableRow></TableHeader><TableBody>{series.map((item) => <TableRow key={item.id}><TableCell>{resolveLocalizedText(item.title, locale)}</TableCell><TableCell>{item.slug}</TableCell><TableCell>{item.displayOrder}</TableCell><TableCell>{item.isActive ? t("active") : t("inactive")}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => open(item)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => remove(item)}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}</div></div>;
}
