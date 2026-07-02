/**
 * 카카오맵 JS SDK 최소 앰비언트 선언.
 * KakaoMap.tsx 가 실제로 사용하는 표면만 좁게 선언한다(전체 SDK 타입 아님).
 * SDK 는 <script> 로 주입되어 전역 window.kakao 에 붙는다.
 */
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    extend(latlng: LatLng): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setBounds(bounds: LatLngBounds): void;
  }

  interface CustomOverlayOptions {
    map?: Map;
    position: LatLng;
    content: HTMLElement | string;
    yAnchor?: number;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
  }

  namespace event {
    function addListener(
      target: unknown,
      type: string,
      handler: (...args: unknown[]) => void
    ): void;
  }

  /** autoload=false 로 로드했을 때 수동 초기화 콜백 */
  function load(callback: () => void): void;
}

interface Window {
  kakao: typeof kakao;
}
