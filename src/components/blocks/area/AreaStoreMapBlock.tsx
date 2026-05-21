'use client';

import SubCompanyStoreMap from '@/components/SubCompanyStoreMap';

interface StoreLocation {
  store_id: string;
  store_slug?: string;
  store_name: string;
  address: string;
  tel: string;
  business_hours: string;
  regular_holiday: string;
  parking_spaces: number;
  landmark: string;
  nearby_stations: string;
  has_booth: boolean;
  lat: number;
  lng: number;
}

interface Props {
  stores: StoreLocation[];
  groupName: string;
  areaSlug: string;
}

export default function AreaStoreMapBlock({ stores, groupName, areaSlug }: Props) {
  return (
    <SubCompanyStoreMap
      stores={stores}
      groupName={groupName}
      linkToStore
      areaSlug={areaSlug}
    />
  );
}
