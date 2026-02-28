"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
    initGooglePlaces?: () => void;
  }
}

export default function AddressAutocomplete({
  streetName, cityName, stateName, zipName, className, required,
}: {
  streetName: string; cityName: string; stateName: string; zipName: string;
  className?: string; required?: boolean;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const acRef     = useRef<any>(null);
  const [city,  setCity]  = useState("");
  const [state, setState] = useState("");
  const [zip,   setZip]   = useState("");

  function attachAutocomplete() {
    if (acRef.current || !inputRef.current || !window.google?.maps?.places) return;

    acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components"],
    });

    acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      if (!place?.address_components) return;
      let num = "", route = "", c = "", st = "", z = "";
      for (const comp of place.address_components) {
        const t = comp.types[0];
        if (t === "street_number") num   = comp.long_name;
        if (t === "route")         route = comp.long_name;
        if (t === "locality")      c     = comp.long_name;
        if (t === "administrative_area_level_1") st = comp.short_name;
        if (t === "postal_code")   z     = comp.long_name;
      }
      setCity(c); setState(st); setZip(z);
      // Street is already in the DOM input from Google — no state update needed
    });
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) return;

    // Already loaded
    if (window.google?.maps?.places) {
      attachAutocomplete();
      return;
    }

    // Set callback — no setState, uses ref-based attach
    window.initGooglePlaces = () => {
      attachAutocomplete();
    };

    if (!document.querySelector("script[data-gp]")) {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
      s.async = true;
      s.defer = true;
      s.dataset.gp = "1";
      document.head.appendChild(s);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        name={streetName}
        placeholder="Start typing an address…"
        required={required}
        autoComplete="off"
        className={className}
      />
      <div className="grid grid-cols-3 gap-3">
        <input type="text" name={cityName}  value={city}  onChange={(e) => setCity(e.target.value)}  placeholder="City" required={required} className={className} />
        <input type="text" name={stateName} value={state} onChange={(e) => setState(e.target.value)} placeholder="ST" maxLength={2} className={className} />
        <input type="text" name={zipName}   value={zip}   onChange={(e) => setZip(e.target.value)}   placeholder="ZIP" className={className} />
      </div>
    </div>
  );
}
