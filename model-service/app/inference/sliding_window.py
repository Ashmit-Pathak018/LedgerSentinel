"""Sliding-window chunking and signal aggregation for call transcripts/audio.

Rules:
1. Split text into overlapping windows without cutting through critical sentences where possible.
2. Each chunk receives its own provenance (chunk_index, character offsets).
3. Extract signals per chunk using the shared extract function.
4. Aggregation preserves evidence integrity:
   - If duplicate signal types occur across chunks, take the one with highest calibrated confidence.
   - Retain the exact evidence_span and redacted_quote from that winning chunk (never combine or fabricate spans).
"""

from __future__ import annotations

import re
from typing import Any
from dataclasses import dataclass

from app.models.signal import Signal, SignalType


@dataclass
class WindowChunk:
    chunk_index: int
    text: str
    char_start: int
    char_end: int
    source_ref: str


def create_sliding_windows(
    text: str,
    source_ref: str,
    target_window_size: int = 250,
    overlap_size: int = 60,
) -> list[WindowChunk]:
    """
    Split text into overlapping character windows using sentence/phrase boundaries.
    Avoids splitting mid-sentence where possible to prevent breaking evidence quotes.
    """
    if not text.strip():
        return []

    if len(text) <= target_window_size:
        return [
            WindowChunk(
                chunk_index=0,
                text=text,
                char_start=0,
                char_end=len(text),
                source_ref=f"{source_ref}_chunk0",
            )
        ]

    # Find punctuation boundaries (., ?, !, \n, ;)
    sentence_ends = [m.end() for m in re.finditer(r"[.?!;\n]+\s*", text)]
    if not sentence_ends or sentence_ends[-1] != len(text):
        sentence_ends.append(len(text))

    chunks: list[WindowChunk] = []
    start = 0
    chunk_idx = 0

    while start < len(text):
        ideal_end = start + target_window_size
        if ideal_end >= len(text):
            end = len(text)
        else:
            # Find nearest sentence break at or after ideal_end (or just before if too far)
            candidates_after = [b for b in sentence_ends if b >= ideal_end]
            candidates_before = [b for b in sentence_ends if start < b <= ideal_end]

            if candidates_before and (ideal_end - candidates_before[-1] < 80):
                end = candidates_before[-1]
            elif candidates_after and (candidates_after[0] - ideal_end < 80):
                end = candidates_after[0]
            else:
                # Fallback: look for space
                space_idx = text.rfind(" ", start, ideal_end)
                end = space_idx if space_idx > start else ideal_end

        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(
                WindowChunk(
                    chunk_index=chunk_idx,
                    text=chunk_text,
                    char_start=start,
                    char_end=end,
                    source_ref=f"{source_ref}_chunk{chunk_idx}",
                )
            )
            chunk_idx += 1

        if end >= len(text):
            break

        # Move start forward with overlap
        start = max(start + 1, end - overlap_size)

    return chunks


def aggregate_signals(chunk_signals: list[list[Signal]], original_text: str | None = None) -> list[Signal]:
    """
    Deduplicate signals across chunks.
    Invariant:
    - Group by signal_type.
    - Pick signal with highest confidence.
    - Retain its authentic evidence_span and quote from the source chunk.
    - Never combine or fabricate spans.
    """
    best_by_type: dict[str, Signal] = {}

    for signals in chunk_signals:
        for sig in signals:
            sig_type = sig.signal_type
            existing = best_by_type.get(sig_type)
            if existing is None or sig.confidence > existing.confidence:
                best_by_type[sig_type] = sig

    return list(best_by_type.values())
