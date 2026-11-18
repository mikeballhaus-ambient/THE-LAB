# Hangman

**Registry id:** `app-hangman` · **Port:** 4105

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

Roles are assigned **per match**: one seat sets the word, the other guesses it.

- **Setter** — types a secret word (3–12 letters, A–Z) and clicks **Set word**. The guesser never sees it.
- **Guesser** — letter tiles on a themed keyboard; wrong guesses draw the gallows (six misses). The pattern uses letter slots; at game end the full word is revealed.
- **Lobby** — section cards for **Play the AI** and **Invite a friend**; active matches show a turn timer like other turn-based games.

## Vs AI

The opponent calls the tool `hangman_submit_move` with either `word` (when it is the setter) or `letter` (when it is the guesser) — the grader enforces which field is legal for its role and says so on a mismatch. A guesser prompt carries the pattern, strikes and remaining letters. No heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-hangman`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
