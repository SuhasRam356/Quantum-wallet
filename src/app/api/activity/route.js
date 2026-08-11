import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1757567/quantum/version/latest";
    const graphqlQuery = `
      query {
        transactions(
          first: 100,
          orderBy: date,
          orderDirection: desc,
          where: { wallet: "${address.toLowerCase()}" }
        ) {
          id
          type
          address
          amount
          date
          status
          transactionHash
        }
      }
    `;

    const resGql = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: graphqlQuery })
    });
    
    const gqlData = await resGql.json();
    let activities = [];
    
    if (gqlData.data && gqlData.data.transactions) {
       activities = gqlData.data.transactions.map(tx => {
          const isReceived = tx.type === "Received ETH";
          return {
            type: tx.type,
            target: isReceived ? address : tx.address,
            sender: isReceived ? tx.address : address,
            amount: (Number(tx.amount) / 1e18).toString(),
            timestamp: Number(tx.date) * 1000
          };
       });
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
