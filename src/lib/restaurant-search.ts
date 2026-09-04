


    const newLeads = [];
    const seenIds = new Set<string>();

    let offset = 0;
    const batchSize = limit;

    while (newLeads.length < limit) {
      const remaining = limit - newLeads.length;

      const leads = await searchLeads({
        city,
        businessType: businessType || "Restaurant",
        limit: batchSize,
        offset,
      });

      if (leads.length === 0) {
        break;
      }

      // Prevent duplicates within this search session.
      const uniqueLeads = leads.filter((lead) => {
        if (seenIds.has(lead.id)) {
          return false;
        }

        seenIds.add(lead.id);
        return true;
      });

      const sourceIds = uniqueLeads.map((lead) => lead.id);

      // Check which of these restaurants are already in Supabase.
      const { data: existingRestaurants, error: lookupError } = await supabase
        .from("restaurants")
        .select("source_id")
        .in("source_id", sourceIds);

      if (lookupError) {
        throw lookupError;
      }

      const existingIds = new Set(
        (existingRestaurants ?? []).map((restaurant) => restaurant.source_id),
      );

      const freshLeads = uniqueLeads
        .filter((lead) => !existingIds.has(lead.id))
        .slice(0, remaining);

      newLeads.push(...freshLeads);

      // Move to the next Open Places page.
      offset += leads.length;
    }

    // Save only the requested number of NEW restaurants.
    if (newLeads.length > 0) {
      const restaurants = newLeads.map((lead) => ({
        source_id: lead.id,
        name: lead.businessName,
        address: lead.location,
        website: lead.website,
        email: lead.email,
        city,
      }));

      const { error: insertError } = await supabase
        .from("restaurants")
        .upsert(restaurants, {
          onConflict: "source_id",
          ignoreDuplicates: true,
        });

      if (insertError) {
        throw insertError;
      }