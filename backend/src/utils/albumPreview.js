export const buildAlbumPreviewImages = (songs) => {
    if (!Array.isArray(songs)) return [];
  
    return songs
      .map((song) => song?.imageUrl)
      .filter(Boolean)
      .slice(0, 4);
  };
  