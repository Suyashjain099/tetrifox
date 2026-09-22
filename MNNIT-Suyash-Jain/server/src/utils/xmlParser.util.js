import { XMLParser } from 'fast-xml-parser';

export const parseXmlManifest = (xmlString) => {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Invalid XML string provided for parsing');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false,
    htmlEntities: false,
    allowBooleanAttributes: false,
    parseTagValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(xmlString);

  if (!parsed || !parsed.Container) {
    throw new Error('Invalid manifest: missing root <Container> element');
  }

  const container = parsed.Container;
  const containerId = container.Id ? String(container.Id) : null;
  const rawParcels = container.parcels?.Parcel;

  if (!rawParcels) {
    return { containerId, parcels: [] };
  }

  const parcelArray = Array.isArray(rawParcels) ? rawParcels : [rawParcels];

  const normalizedParcels = parcelArray.map((item, index) => {
    const recipientData = item.Receipient || item.Recipient || {};
    const addressData = recipientData.Address || {};

    const weightKg = parseFloat(item.Weight ?? item.weightKg ?? 0);
    const valueEur = parseFloat(item.Value ?? item.valueEur ?? 0);

    const postalCode = addressData.PostalCode || recipientData.PostalCode || item.PostalCode || '';
    const destinationCountry = item.DestinationCountry || (postalCode ? 'NL' : 'NL');

    return {
      id: item.Id ? String(item.Id) : `PARCEL-${index + 1}`,
      recipient: {
        name: recipientData.Name || 'Unknown',
        street: addressData.Street || '',
        houseNumber: String(addressData.HouseNumber || ''),
        postalCode: postalCode,
        city: addressData.City || '',
      },
      weightKg: isNaN(weightKg) ? 0 : weightKg,
      valueEur: isNaN(valueEur) ? 0 : valueEur,
      destinationCountry: destinationCountry,
      postalCode: postalCode,
    };
  });

  return {
    containerId,
    parcels: normalizedParcels,
  };
};
