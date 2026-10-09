# Research direction and prior-work assessment

The candidate subject is **encrypted guest intake across request, membership and generation transitions**. It is narrower than encrypted storage, post-compromise recovery or key transparency generally. The present evidence establishes a useful first-party specification and one persisted provisioning defect, not a new security primitive or a completed comparative result.

Primary sources were checked on 9 October 2026. “Full text retrieved” means that the text was available for scoped inspection; it does not imply complete independent verification of every proof, protocol or artifact. Abstract-only limitations below are deliberately visible.

| Work / primary source | Reading boundary and relevant established result | Relation to the candidate; next comparison |
|---|---|---|
| [Backendal et al., A Formal Treatment of E2EE Cloud Storage, CRYPTO 2024](https://eprint.iacr.org/2024/989) | Abstract/metadata verified; PDF fetch unavailable in this session. Malicious-server confidentiality/integrity notions include client compromise. | A formal model of [1Bridge](https://1bridgevault.com) alone is insufficient novelty. Read the full syntax and reductions; map guest intake and transitions onto supported operations before identifying any model gap. |
| [Hofmann and Truong, E2EE Cloud Storage in the Wild, CCS 2024](https://brokencloudstorage.info/paper.pdf) | Full text retrieved; scoped inspection of threat model and key/file/metadata attacks. | Key substitution and injected encrypted records are known. Replacement acceptance is a calibration control, not a new attack. Compare policy assumptions, evaluation targets and artifact interfaces. |
| [CONIKS, USENIX Security 2015](https://www.usenix.org/system/files/conference/usenixsecurity15/sec15-paper-melara.pdf) | Full text retrieved; authenticated key bindings and consistency addressed through transparency. | Signed keys alone do not provide globally consistent directory views. Compare enrollment and verification responsibilities before adding transparency machinery. |
| [Akeso, PoPETs 2025](https://petsymposium.org/popets/2025/popets-2025-0139.pdf) | Full text retrieved; storage compromise recovery uses group-key updates and cloud-side enclave/updatable encryption. | Different trust and re-encryption costs. No claim that ordinary generation rotation gives equivalent recovery. Compare retained ciphertext and compromise assumptions. |
| [Encrypted Collaborative Documents, USENIX Security 2026](https://www.usenix.org/system/files/usenixsecurity26-knabenhans.pdf) | Full text retrieved; formal asynchronous encrypted collaboration and malicious-server setting. | “End-to-end workflows” and asynchronous transitions are not novel by themselves. Accountless upload-only authority must be compared with its participant and state model. |
| [Group Key Progression, EUROCRYPT 2026](https://eprint.iacr.org/2025/1028) | Abstract/metadata verified; revised 10 May 2026; PDF fetch unavailable in this session. Dynamic group access to persistent key intervals and post-compromise security are established aims. | This is particularly close to generation/membership research. Complete full-text and artifact comparison before claiming a new transition or access-containment result. |
| [Share with Care: Breaking E2EE in Nextcloud, EuroS&P 2024](https://eprint.iacr.org/2024/546) | Primary bibliographic record checked; detailed full-paper/model comparison remains incomplete. | Existing Nextcloud attacks and their attacker powers must not be repackaged as new findings. Read the file-drop and sharing boundaries alongside current sources. |
| [Nextcloud GHSA-p3qw-7gwx-wg24](https://github.com/nextcloud/security-advisories/security/advisories/GHSA-p3qw-7gwx-wg24) | Published vendor advisory and pinned patched source examined. The known issue concerns file-drop scope outside the shared folder; it does not imply reading or modifying existing files. | Use affected/fixed versions as executed controls, not as a new vulnerability claim. No deployed calibration has completed in this revision. |
| [AS2, RFC 4130](https://www.rfc-editor.org/rfc/rfc4130) | Primary standard inspected for authenticated messages/receipts. | Signatures, commitments and receipts are existing baselines. A combination of them is not automatically an academic contribution. |

## Narrowed questions

1. Can a single trace vocabulary expose disagreement between authorized request state, accepted records and persisted recipient keys in two real systems, while separating expected cryptographic limits from defects?
2. Which client acceptance properties require authenticated initial bindings, and which can be checked under the existing service/email delivery profile?
3. Can upload-only guest acceptance remain correctly bound to locally authenticated request/generation state across offline operation, retries and membership changes, with lower state/interaction cost than an appropriate established baseline?

Questions 1 and 2 support an empirical technical report immediately. Question 3 is a **candidate**, not a claimed unsolved problem. A signature does not establish real-world identity, a stale local state cannot reveal an unseen newer generation, and an in-memory replay set does not provide durable global consumption.

## Honest academic decision

At present, retain both research manuscripts as technical reports. The duplicate-recipient case is a confirmed implementation defect and a useful illustration of persisted evidence; it does not independently establish a general methodological result. The experimental protocol is a standard signed-envelope baseline and does not meet a novelty threshold.

Proceed with a comparative paper only after transfer to another actual implementation and a defensible method/result beyond the closest storage analyses. Proceed with a protocol paper only after a full prior-work comparison identifies an unprovided property or defensible cost tradeoff and the new construction is explicitly modelled, reviewed and evaluated. If the empirical work becomes merely an evaluation of that construction, combine it with the protocol paper.

Public reputation is better served by reproducible, narrowly qualified evidence than by presenting these open gates as completed research contributions.
