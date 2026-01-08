// Generate a unique task ID in format: "a1b2c3d-N"
// where the first part is a 7-char random hash and N is the sequence number

export interface GeneratedId {
	id: string;
	newSequence: number;
}

// Generate a random 7-character hex hash
function generateHash(): string {
	const randomBytes = crypto.getRandomValues(new Uint8Array(4));
	let hash = "";
	for (const byte of randomBytes) {
		hash += byte.toString(16).padStart(2, "0");
	}
	return hash.slice(0, 7);
}

// Generate a new task ID
export function generateTaskId(lastSequence: number): GeneratedId {
	const hash = generateHash();
	const newSequence = lastSequence + 1;
	return {
		id: `${hash}-${newSequence}`,
		newSequence,
	};
}

// Parse a task ID into its components
export function parseTaskId(
	id: string,
): { hash: string; sequence: number } | null {
	const match = id.match(/^([a-f0-9]{7})-(\d+)$/);
	if (!match) {
		return null;
	}
	const hash = match[1];
	const sequence = match[2];
	if (!hash || !sequence) {
		return null;
	}
	return {
		hash,
		sequence: parseInt(sequence, 10),
	};
}
