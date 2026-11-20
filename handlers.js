// handlers.js - Manejador global del sitio (Client-Side)

function extraerYouTubeId(urlOrId) {
  if (!urlOrId) return '';
  let id = urlOrId.trim();
  if (id.includes('v=')) {
    id = id.split('v=')[1].split('&')[0];
  } else if (id.includes('youtu.be/')) {
    id = id.split('youtu.be/')[1].split('?')[0];
  } else if (id.includes('embed/')) {
    id = id.split('embed/')[1].split('?')[0];
  }
  return id;
}

function obtenerEraPorId(idEra) {
  if (!DB || !DB.eras_grabacion) return null;
  return DB.eras_grabacion.find((e) => e.id_era === idEra) || null;
}

function obtenerEstatusPorId(idEstatus) {
  if (!DB || !DB.estatus) return 'Lanzado';
  const est = DB.estatus.find((e) => e.id_estatus === idEstatus);
  return est ? est.nombre_estatus : 'Lanzado';
}

function obtenerCancionPorId(idCancion) {
  if (!DB || !DB.canciones) return null;
  return DB.canciones.find((c) => c.id_cancion === idCancion) || null;
}

// ==========================================
// MÓDULO DE ERAS
// ==========================================

function obtenerEras() {
  if (!DB || !DB.eras_grabacion) return [];
  return DB.eras_grabacion.map((era) => ({
    IDEra: era.id_era,
    NombreEra: era.nombre_era,
    InfoEra: era.info_era
  }));
}

function obtenerEraDetalle(idEra) {
  if (!idEra || !DB || !DB.eras_grabacion) return null;

  const era = obtenerEraPorId(idEra);
  if (!era) return null;

  const canciones = (DB.canciones || [])
    .filter((c) => c.id_era === idEra)
    .map((c) => ({
      IDCancion: c.id_cancion,
      NombreCancion: c.nombre_cancion,
      IDStatus: obtenerEstatusPorId(c.id_estatus),
      IDEra: c.id_era
    }));

  return {
    Era: {
      IDEra: era.id_era,
      NombreEra: era.nombre_era,
      InfoEra: era.info_era
    },
    Canciones: canciones
  };
}

// ==========================================
// MÓDULO DE ÁLBUMES
// ==========================================

function obtenerAlbumes() {
  if (!DB || !DB.albumes) return [];
  return DB.albumes
    .filter((album) => album.id_album !== 'ALB-00')
    .map((album) => {
      const era = obtenerEraPorId(album.id_era);
      const cover =`assets/img/${album.id_album.replace('-', '_')}.jpg`;
      return {
        IDAlbum: album.id_album,
        NombreAlbum: album.nombre_album,
        TipoAlbum: album.tipo_album || 'Álbum',
        FechaLanz: album.fecha_lanzamiento || '',
        InfoAlbum: album.info_album || '',
        LinkSpotifyAlb: album.link_spotify_alb
          ? `https://open.spotify.com/album/${album.link_spotify_alb}`
          : '#',
        LinkYTAlb: album.link_yt_alb
          ? (album.link_yt_alb.startsWith('PL')
              ? `https://www.youtube.com/playlist?list=${album.link_yt_alb}`
              : `https://www.youtube.com/watch?v=${album.link_yt_alb}`)
          : '#',
        AlbumCover: cover,
        IDEra: album.id_era,
        NombreEra: era ? era.nombre_era : ''
      };
    });
}

function obtenerAlbumDetalle(idAlbum) {
  if (!idAlbum || !DB || !DB.albumes) return null;

  const album = DB.albumes.find((a) => a.id_album === idAlbum);
  if (!album) return null;

  const era = obtenerEraPorId(album.id_era);

   // 1. Filtrar y ordenar primero por número de disco, luego por número de pista
  const trackEntries = (DB.tracklist || [])
    .filter((t) => t.id_album === idAlbum)
    .sort((a, b) => {
      // Si existe numero_disco en ambos, comparamos
      if (a.numero_disco && b.numero_disco && a.numero_disco !== b.numero_disco) {
        return a.numero_disco - b.numero_disco;
      }
      // Si no, ordenamos por número de pista normal
      return (a.numero_pista || 0) - (b.numero_pista || 0);
    });

  // 2. Formatear cada pista
  const tracklist = trackEntries.map((t, index) => {
    const cancion = obtenerCancionPorId(t.id_cancion);
    let trackName = cancion ? cancion.nombre_cancion : 'Desconocida';
    
    // Si la pista tiene número de disco, agregamos un indicador visual
    if (t.numero_disco) {
      trackName = `<span class="text-gray-500 text-xs mr-2">[Disco ${t.numero_disco}]</span> ${trackName}`;
    }

    return {
      NumeroTrack: t.numero_pista || (index + 1),
      IDCancion: cancion ? cancion.id_cancion : t.id_cancion,
      NombreCancion: trackName,
      Duracion: cancion && cancion.duracion ? cancion.duracion : '--:--',
      LinkYTVideo: cancion ? cancion.link_yt_video : null
    };
  });

  const cover = `assets/img/${album.id_album.replace('-', '_')}.jpg`;
    

  return {
    Album: {
      IDAlbum: album.id_album,
      NombreAlbum: album.nombre_album,
      TipoAlbum: album.tipo_album || 'Álbum de estudio',
      FechaLanzamiento: album.fecha_lanzamiento || '',
      InfoAlbum: album.info_album || '',
      LinkSpotify: album.link_spotify_alb
        ? `https://open.spotify.com/album/${album.link_spotify_alb}`
        : '#',
      LinkYT: album.link_yt_alb
        ? (album.link_yt_alb.startsWith('PL')
            ? `https://www.youtube.com/playlist?list=${album.link_yt_alb}`
            : `https://www.youtube.com/watch?v=${album.link_yt_alb}`)
        : '#',
      AlbumCover: cover
    },
    Era: {
      IDEra: album.id_era,
      NombreEra: era ? era.nombre_era : ''
    },
    Tracklist: tracklist
  };
}

// ==========================================
// MÓDULO DE CANCIONES
// ==========================================

function obtenerListaCanciones(filtroTexto = '', filtroEra = '') {
  if (!DB || !DB.canciones) return [];

  return DB.canciones
    .map((c) => {
      const track = (DB.tracklist || []).find((t) => t.id_cancion === c.id_cancion);
      const album = track
        ? (DB.albumes || []).find((a) => a.id_album === track.id_album)
        : null;
      const era = obtenerEraPorId(c.id_era);

      return {
        IDCancion: c.id_cancion,
        NombreCancion: c.nombre_cancion,
        Estatus: obtenerEstatusPorId(c.id_estatus),
        Duracion: c.duracion || '--:--',
        IDAlbum: album ? album.id_album : 'ALB-00',
        NombreAlbum: album ? album.nombre_album : 'Canciones Inéditas / Sencillos',
        IDEra: era ? era.id_era : c.id_era,
        NombreEra: era ? era.nombre_era : '',
        TieneVideo: Boolean(c.link_yt_video && c.link_yt_video !== '' && c.link_yt_video !== '-')
      };
    })
    .filter((c) => {
      const coincideTexto =
        c.NombreCancion.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        c.NombreAlbum.toLowerCase().includes(filtroTexto.toLowerCase());
      const coincideEra = filtroEra === '' || c.IDEra === filtroEra;
      return coincideTexto && coincideEra;
    })
    .sort((a, b) => a.NombreCancion.localeCompare(b.NombreCancion));
}

// ==========================================
// MÓDULO DE VIDEOS
// ==========================================

function obtenerListaVideos() {
  if (!DB || !DB.canciones) return [];

  return DB.canciones
    .filter((c) => c.link_yt_video && c.link_yt_video !== '' && c.link_yt_video !== '-')
    .map((c) => {
      const track = (DB.tracklist || []).find((t) => t.id_cancion === c.id_cancion);
      const album = track
        ? (DB.albumes || []).find((a) => a.id_album === track.id_album)
        : null;
      const era = obtenerEraPorId(c.id_era);

      return {
        IDCancion: c.id_cancion,
        NombreCancion: c.nombre_cancion,
        IDEra: era ? era.id_era : c.id_era,
        NombreEra: era ? era.nombre_era : '',
        IDAlbum: album ? album.id_album : 'ALB-00',
        NombreAlbum: album ? album.nombre_album : 'Canciones Inéditas / Sencillos',
        LinkYTVideo: extraerYouTubeId(c.link_yt_video)
      };
    })
    .sort((a, b) => a.NombreCancion.localeCompare(b.NombreCancion));
}

function obtenerDetalleVideo(idCancion) {
  if (!idCancion || !DB || !DB.canciones) return null;

  const cancion = DB.canciones.find((c) => c.id_cancion === idCancion);
  if (!cancion) return null;

  const track = (DB.tracklist || []).find((t) => t.id_cancion === idCancion);
  const album = track
    ? (DB.albumes || []).find((a) => a.id_album === track.id_album)
    : null;
  const era = obtenerEraPorId(cancion.id_era);

  return {
    Cancion: {
      IDCancion: cancion.id_cancion,
      NombreCancion: cancion.nombre_cancion,
      LinkYTVideo: extraerYouTubeId(cancion.link_yt_video)
    },
    Album: {
      IDAlbum: album ? album.id_album : 'ALB-00',
      NombreAlbum: album ? album.nombre_album : 'Canciones Inéditas / Sencillos / Colaboraciones'
    },
    Era: {
      IDEra: era ? era.id_era : cancion.id_era,
      NombreEra: era ? era.nombre_era : '',
      InfoEra: era ? era.info_era : ''
    }
  };
}

// ==========================================
// MÓDULO INDEX / ESTADÍSTICAS
// ==========================================

function obtenerEstadisticasIndex() {
  if (!DB) return { totalEras: 0, totalAlbumes: 0, totalCanciones: 0, totalVideos: 0 };

  const totalEras = DB.eras_grabacion ? DB.eras_grabacion.length : 0;
  const totalAlbumes = DB.albumes ? DB.albumes.filter(a => a.id_album !== 'ALB-00').length : 0;
  const totalCanciones = DB.canciones ? DB.canciones.length : 0;
  const totalVideos = DB.canciones
    ? DB.canciones.filter(c => c.link_yt_video && c.link_yt_video !== '' && c.link_yt_video !== '-').length
    : 0;

  return { totalEras, totalAlbumes, totalCanciones, totalVideos };
}

function obtenerAlbumesDestacados(limite = 4) {
  // Prioriza los álbumes más emblemáticos según el criterio original de destacados
  const destacados = ['ALB-06', 'ALB-05', 'ALB-07', 'ALB-08'];
  const albumes = obtenerAlbumes();
  const filtrados = albumes.filter(a => destacados.includes(a.IDAlbum));
  return filtrados.slice(0, limite);
}

function obtenerVideosDestacados(limite = 3) {
  const videos = obtenerListaVideos();
  const destacadosIds = ['CAN-065', 'CAN-067', 'CAN-114']; // Thriller, Billie Jean, Smooth Criminal
  const filtrados = videos.filter(v => destacadosIds.includes(v.IDCancion));
  return filtrados.slice(0, limite);
}