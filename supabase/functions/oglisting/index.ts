// Redirect old oglisting to og-listing
Deno.serve((req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const target = id
    ? `https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/og-listing?id=${id}`
    : "https://re-bali.com";
  return Response.redirect(target, 301);
});
