# India Social Network (ISN) - Bharat Roots Connect
## A Hypergraph-Based Platform for Multi-Layered Family Relationships

**Complete Documentation & Technical Report**

---

## VISVESVARAYA TECHNOLOGICAL UNIVERSITY
**"JNANA SANGAMA", MACHHE, BELAGAVI-590018**

### Phase-1 & Phase-2 Consolidated Project Report

**Project Title:** India Social Network: A Hypergraph-Based Platform for Multi-Layered Family Relationships

**Submitted in partial fulfillment of the requirements for the VII semester**  
**Bachelor of Engineering in Computer Science and Engineering**  
**Visvesvaraya Technological University, Belagavi**

---

### Team Members
- **Harshith S J** (1CD22CS043)
- **Prajwal R K** (1CD22CS069)
- **Suhas B S** (1CD22CS153)

### Under the Guidance of
**Dr. Shreekanth M Prabhu**  
Head of the Department  
Department of Computer Science and Engineering

---

**Department of Computer Science and Engineering**  
**CAMBRIDGE INSTITUTE OF TECHNOLOGY, BANGALORE 560036**  
**Academic Year: 2024-2025**

---

<div style="page-break-after: always;"></div>

## CERTIFICATE

**CAMBRIDGE INSTITUTE OF TECHNOLOGY**  
K.R. Puram, Bangalore-560 036  
**DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING**

---

Certified that **Mr. Suhas B S**, **Mr. Harshith S J**, and **Mr. Prajwal R K** bearing USN **1CD22CS153**, **1CD22CS043**, and **1CD22CS104** respectively, are bonafide students of Cambridge Institute of Technology, have successfully completed the project entitled **"A Hypergraph-Based Platform for Multi-Layered Family Relationships"** in partial fulfillment of the requirements for VII semester Bachelor of Engineering in Computer Science and Engineering of Visvesvaraya Technological University, Belagavi during academic year 2024-2025.

It is certified that all Corrections/Suggestions indicated for Internal Assessment have been incorporated in the report deposited in the departmental library. The project report has been approved as it satisfies the academic requirements in respect of project work prescribed for the Bachelor of Engineering degree.

---

**Project Guide**  
Dr. Shreekanth M Prabhu  
Dept. of CSE, CITech

**Project Co-ordinator**  
Dr. Shilpa V  
Dept. of CSE, CITech

**Head of the Department**  
Dr. Shreekanth M Prabhu  
Dept. of CSE, CITech

---

<div style="page-break-after: always;"></div>

## DECLARATION

We, **Mr. Suhas B S**, **Mr. Harshith S J**, and **Mr. Prajwal R K** bearing USN **1CD22CS153**, **1CD22CS043**, and **1CD22CS104** respectively, are students of VII semester, Computer Science and Engineering, Cambridge Institute of Technology, hereby declare that the project entitled **"A Hypergraph-Based Platform for Multi-Layered Family Relationships"** has been carried out by us and submitted in partial fulfillment of the course requirements of VII semester Bachelor of Engineering in Computer Science and Engineering as prescribed by Visvesvaraya Technological University, Belagavi, during the academic year 2024-2025.

We also declare that, to the best of our knowledge and belief, the work reported here does not form part of any other report on the basis of which a degree or award was conferred on an earlier occasion on this by any other student.

---

**Date:** _______________

| Name | USN | Signature |
|------|-----|-----------|
| Suhas B S | 1CD22CS153 | |
| Harshith S J | 1CD22CS043 | |
| Prajwal R K | 1CD22CS104 | |

---

<div style="page-break-after: always;"></div>

## ACKNOWLEDGEMENT

We would like to place on record our deep sense of gratitude to **Shri. D. K. Mohan**, Chairman, Cambridge Group of Institutions, Bangalore, India for providing excellent Infrastructure and Academic Environment at CItech without which this work would not have been possible.

We are extremely thankful to **Dr. G. Indumathi**, Principal, CITech, Bangalore, for providing us the academic ambience and everlasting motivation to carry out this work and shaping our careers.

We express our sincere gratitude to **Dr. Shreekanth M Prabhu**, HOD and our Project Guide, Dept. of Computer Science and Engineering, CITech, Bangalore, for his invaluable guidance, constant motivation, and insightful suggestions that helped shape and complete this work successfully.

We also wish to extend our thanks to **Dr. Shilpa V**, Project Coordinator, Dept. of CSE, CITech, Bangalore, for critical, insightful comments, guidance and constructive suggestions to improve the quality of this work.

Finally, to all our friends and teachers who helped us in some technical aspects and last but not the least we wish to express deepest sense of gratitude to our parents who were a constant source of encouragement and stood by us as pillar of strength for completing this work successfully.

---

**Harshith S J** (1CD22CS043)  
**Suhas B S** (1CD22CS153)  
**Prajwal R K** (1CD22CS104)

---

<div style="page-break-after: always;"></div>

## ABSTRACT

Databases historically emerged to address businesses' data processing needs. When it comes to social information, their worldview is at best about managing the demographics of customers. However, today's world is much more interconnected than ever, as social platforms become pervasive. The IT systems, of which databases were integral, addressed the needs of modern Western societies where individuals were central. This has left the needs of traditional societies unaddressed, wherein families and communities play an important role.

We propose a database that simultaneously meets modern society's needs, where strangers connect on social platforms, and traditional societies where families, clans, communities, and localities rule the roost. The proposed database is expected to support societal-scale applications. We propose a simple yet ingenious method that unifies social, combinatorial, and ontological perspectives to achieve this challenging objective.

**India Social Network (ISN) - Bharat Roots Connect** is a comprehensive, feature-rich platform that goes beyond traditional family tree applications. It integrates:

- **Hypergraph-based data modeling** for complex multi-layered relationships
- **AI-powered relationship analysis** using Google Gemini 2.0 Flash
- **Real-time communication** with WhatsApp-like chat and video calling
- **Advanced graph visualization** using Cytoscape.js and Neo4j
- **Web 3.0 principles** for decentralized, secure data management
- **Cultural sensitivity** designed specifically for Indian family structures
- **Scalable architecture** using React, TypeScript, Node.js, Express, MongoDB, and Neo4j

The platform successfully addresses the limitations of conventional social networks by providing tools to map, visualize, preserve, and interact with complex family relationships in ways that honor Indian cultural contexts while leveraging cutting-edge technology.

---

**Keywords:** Social Database, Data Model, Ontology, Combinatorial Perspective, Hypergraph, Neo4j, Graph Visualization, AI-Powered Analysis, Real-time Communication, WebRTC, Family Tree, Indian Culture, Gemini AI

---

