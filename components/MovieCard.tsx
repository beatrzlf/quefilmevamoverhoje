import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/poster";

export default function MovieCard({ movie, children, size = "w185" }: { movie: Movie; children?: React.ReactNode; size?: "w185" | "w342" }) {
  const img = posterUrl(movie.posterPath, size);
  return (
    <article className="movie-card">
      {img ? <img src={img} alt={`Pôster de ${movie.title}`} loading="lazy" /> : <div className="poster-ph" aria-hidden>🎬</div>}
      <div className="movie-info">
        <h3>
          {movie.title} {movie.year && <span className="muted">({movie.year})</span>}
        </h3>
        {movie.rating !== null && <span className="badge">★ {movie.rating.toFixed(1)}</span>}
        {children}
      </div>
    </article>
  );
}
