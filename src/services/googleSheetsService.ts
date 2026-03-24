import Papa from 'papaparse';

const SHEET_ID = '1wY509tvTMEsgvxsbA8CAivukxSieu3FOqfMIBNpqtyk';

// GIDs for the specific sheets. 
// Based on common patterns and the user's description.
const GID_RESULTADO = '1899538392'; 
const GID_TABELA_EMAIL = '1440626359'; 

export interface HighlightData {
  name: string;
  photoUrl: string;
  messages?: string[];
  rank?: string;
}

export async function fetchHighlightsOfMonth(): Promise<HighlightData[]> {
  try {
    // 1. Fetch "Resultado" sheet to get winners
    const fullSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Resultado`;
    const fullResponse = await fetch(fullSheetUrl);
    const fullCsv = await fullResponse.text();
    const fullData = Papa.parse(fullCsv).data as string[][];
    
    const winners: { name: string, rank: string }[] = [];
    
    // Look for 🥇 (1st), 🥈 (2nd) and DESTACÃO
    const seenNames = new Set<string>();
    fullData.forEach(row => {
      row.forEach((cell, colIdx) => {
        const cellStr = String(cell);
        let name = "";
        let rank = "";

        if (cellStr.includes('🥇') || cellStr.includes('1º')) {
          name = (row[colIdx + 1] || row[colIdx]).trim();
          rank = '🥇 1º Lugar';
        } else if (cellStr.includes('🥈') || cellStr.includes('2º')) {
          name = (row[colIdx + 1] || row[colIdx]).trim();
          rank = '🥈 2º Lugar';
        } else if (cellStr.toUpperCase().includes('DESTACÃO')) {
          name = (row[colIdx + 1] || row[colIdx]).trim();
          rank = '⭐ DESTACÃO';
        }

        if (name && !name.includes('🥇') && !name.includes('1º') && !name.includes('🥈') && !name.includes('2º') && !name.toUpperCase().includes('DESTACÃO')) {
          if (!seenNames.has(name.toLowerCase())) {
            winners.push({ name, rank });
            seenNames.add(name.toLowerCase());
          }
        }
      });
    });

    // Fallback if no winners found via icons
    if (winners.length === 0) {
      const b37 = fullData[36]?.[1]; // B37 is row 37, col 2 (index 36, 1)
      if (b37 && b37.trim() !== "") {
        winners.push({ name: b37.trim(), rank: '1º Lugar' });
      } else {
        winners.push({ name: "Ithalo", rank: '1º Lugar' });
      }
    }

    // 2. Fetch "Tabela de Email" sheet for photos
    const tabelaUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Tabela%20de%20Email`;
    const tabelaResponse = await fetch(tabelaUrl);
    const tabelaCsv = await tabelaResponse.text();
    const tabelaParsed = Papa.parse(tabelaCsv).data as string[][];
    const headers = tabelaParsed[0] || [];
    const rows = tabelaParsed.slice(1);
    const nomeIdx = headers.findIndex(h => h.trim().toLowerCase().includes('nome'));
    const fotoIdx = headers.findIndex(h => h.trim().toLowerCase().includes('foto'));

    // 3. Fetch Messages from gid 991740848
    const messagesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=991740848`;
    const messagesResponse = await fetch(messagesUrl);
    const messagesCsv = await messagesResponse.text();
    const messagesParsed = Papa.parse(messagesCsv).data as string[][];
    const msgHeaders = messagesParsed[0] || [];
    const firstHighlightIdx = msgHeaders.findIndex(h => h.trim().toUpperCase().includes('PRIMEIRO DESTAQUE'));
    const secondHighlightIdx = msgHeaders.findIndex(h => h.trim().toUpperCase().includes('SEGUNDO DESTAQUE'));
    const firstMsgIdx = firstHighlightIdx !== -1 ? firstHighlightIdx + 1 : -1;
    const secondMsgIdx = secondHighlightIdx !== -1 ? secondHighlightIdx + 1 : -1;

    const highlights: HighlightData[] = winners.map(winner => {
      const searchName = winner.name.toLowerCase();
      
      // Find photo
      let photoUrl = null;
      const personRow = rows.find(row => {
        const rowName = String(row[nomeIdx] || "").trim().toLowerCase();
        return rowName !== "" && (rowName.includes(searchName) || searchName.includes(rowName));
      });
      if (personRow && personRow[fotoIdx]) {
        photoUrl = processPhotoUrl(personRow[fotoIdx]);
      }

      // Find messages
      const messages: string[] = [];
      messagesParsed.slice(1).forEach(row => {
        // Check first highlight column
        if (firstHighlightIdx !== -1 && firstMsgIdx !== -1 && firstMsgIdx < row.length) {
          const hName = String(row[firstHighlightIdx] || "").trim().toLowerCase();
          const msg = String(row[firstMsgIdx] || "").trim();
          if (hName && (hName.includes(searchName) || searchName.includes(hName)) && msg !== "") {
            messages.push(msg);
          }
        }
        // Check second highlight column
        if (secondHighlightIdx !== -1 && secondMsgIdx !== -1 && secondMsgIdx < row.length) {
          const hName = String(row[secondHighlightIdx] || "").trim().toLowerCase();
          const msg = String(row[secondMsgIdx] || "").trim();
          if (hName && (hName.includes(searchName) || searchName.includes(hName)) && msg !== "") {
            messages.push(msg);
          }
        }
      });

      return {
        name: winner.name,
        photoUrl: photoUrl || `https://picsum.photos/seed/${winner.name}/400/400`,
        messages: messages.length > 0 ? messages : undefined,
        rank: winner.rank
      };
    });

    return highlights;
  } catch (error) {
    console.error('Error fetching highlights data:', error);
    return [];
  }
}

export interface HistoryItem {
  month: string;
  highlight: string;
  isDestacao: boolean;
}

export async function fetchHighlightHistory(): Promise<HistoryItem[]> {
  try {
    const historyUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1115650485`;
    const response = await fetch(historyUrl);
    const csv = await response.text();
    const parsed = Papa.parse(csv).data as string[][];
    
    // Skip header and filter out empty rows
    const history: HistoryItem[] = parsed.slice(1)
      .filter(row => row[0] && row[1] && row[1].trim() !== "")
      .map(row => ({
        month: row[0],
        highlight: row[1],
        isDestacao: row[2] && row[2].trim().includes("DESTACÃO") ? true : false
      }));
      
    return history;
  } catch (error) {
    console.error('Error fetching highlight history:', error);
    return [];
  }
}

function processPhotoUrl(url: string): string {
  let processed = url.trim();
  
  // Handle Google Drive links
  if (processed.includes('drive.google.com')) {
    const idMatch = processed.match(/\/d\/(.+?)\//) || processed.match(/id=(.+?)(&|$)/) || processed.match(/id=(.+?)$/);
    if (idMatch) {
      // Use thumbnail format which is often more reliable for embedding
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
  }
  
  return processed;
}
