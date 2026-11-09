export interface Movie {
  /** ID no TMDB */
  id: number;
  title: string;
  originalTitle: string;
  year: string | null;
  overview: string;
  posterPath: string | null;
  rating: number | null;
  /** ID no IMDb (ex.: tt0133093), quando disponível */
  imdbId?: string | null;
}
