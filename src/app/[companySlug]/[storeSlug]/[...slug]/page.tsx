import { notFound } from 'next/navigation';

export default function CatchAllStorePage() {
  // Sub-pages will be implemented progressively.
  // For now, this catches all unimplemented sub-routes under /{subCompany}/{store}/*
  notFound();
}
