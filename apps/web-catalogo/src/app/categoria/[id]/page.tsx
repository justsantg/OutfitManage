import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCatalogo, fetchCategorias } from '../../../lib/api';
import ProductCard from '../../../components/ProductCard';
import { ArrowLeft, Tag, ShoppingBag, Sparkles } from 'lucide-react';

interface CategoriaPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CategoriaPageProps): Promise<Metadata> {
  const { id } = await params;
  const categorias = await fetchCategorias();
  const categoria = categorias.find((c) => c.id === id);

  if (!categoria) {
    return {
      title: 'Categoría | OutfitManage',
    };
  }

  return {
    title: `${categoria.nombre} | Catálogo OutfitManage`,
    description: `Explora todas las prendas de ${categoria.nombre} en nuestra tienda. Consulta stock y pide directo por WhatsApp.`,
  };
}

export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const { id } = await params;
  const [categorias, catalogoData] = await Promise.all([
    fetchCategorias(),
    fetchCatalogo({ categoria: id, limit: 48 }),
  ]);

  const categoria = categorias.find((c) => c.id === id);

  if (!categoria) {
    notFound();
  }

  const productos = catalogoData.items;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Navegación de migas de pan (Breadcrumb) */}
      <div className="flex items-center justify-between">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ver todas las categorías</span>
        </Link>

        <span className="text-xs text-slate-500 font-mono">
          {productos.length} prendas en esta categoría
        </span>
      </div>

      {/* Header de la Categoría */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-mono font-bold tracking-wider uppercase">
          <Tag className="w-3.5 h-3.5" />
          <span>Categoría Oficial</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {categoria.nombre}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Explora todas las prendas y modelos configurados dentro de la categoría {categoria.nombre}.
        </p>
      </div>

      {/* Selector de Otras Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          href="/catalogo"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500 shrink-0"
        >
          Todas
        </Link>
        {categorias.map((cat) => {
          const isCurrent = cat.id === id;
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.id}`}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isCurrent
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500'
              }`}
            >
              {cat.nombre}
            </Link>
          );
        })}
      </div>

      {/* Grid de Productos */}
      {productos.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No hay prendas en esta categoría aún
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Puedes agregar prendas y stock a esta categoría desde el panel de administración.
          </p>
          <Link
            href="/catalogo"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs"
          >
            Explorar otras categorías
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((producto) => (
            <ProductCard key={producto.productoId} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
