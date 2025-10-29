## TABLE OF CONTENTS

| Chapter | Title | Page |
|---------|-------|------|
| | **ABSTRACT** | i |
| | **TABLE OF CONTENTS** | ii |
| | **LIST OF FIGURES** | iii |
| | **LIST OF TABLES** | iv |
| **Chapter 1** | **INTRODUCTION** | 1 |
| 1.1 | Project Context and Motivation | 1 |
| 1.2 | Challenges in Existing Platforms | 3 |
| 1.3 | Objectives | 6 |
| 1.4 | Societal Impact and Future Potential | 9 |
| **Chapter 2** | **LITERATURE SURVEY** | 11 |
| 2.1 | Graph-Oriented Databases for Social Networks | 11 |
| 2.2 | Ontology-Driven Cultural and Community Modeling | 13 |
| 2.3 | Web 3.0 and Decentralized Social Platforms | 16 |
| 2.4 | Privacy, Data Protection, and Indian Regulations | 18 |
| **Chapter 3** | **SYSTEM ANALYSIS** | 21 |
| 3.1 | Software Requirements | 22 |
| **Chapter 4** | **DESIGN AND ARCHITECTURE** | 26 |
| 4.1 | System Architecture Overview | 26 |
| 4.2 | Frontend Architecture | 28 |
| 4.3 | Backend Architecture | 30 |
| 4.4 | Database Design | 32 |
| 4.5 | Proposed Methods and Workflows | 34 |
| **Chapter 5** | **CORE FEATURES IMPLEMENTATION** | 37 |
| 5.1 | Technology Stack | 37 |
| 5.2 | User Authentication & Authorization | 39 |
| 5.3 | Family Tree Builder | 41 |
| 5.4 | Graph Visualization System | 43 |
| 5.5 | Database Implementation | 45 |
| **Chapter 6** | **ADVANCED FEATURES** | 48 |
| 6.1 | Connected Trees Meta-Graph Visualization | 48 |
| 6.2 | AI Relationship Analyzer with Gemini 2.0 | 52 |
| 6.3 | Family Communication System | 56 |
| 6.4 | Real-Time Chat with MongoDB | 60 |
| 6.5 | Voice & Video Calling with WebRTC | 63 |
| 6.6 | Dashboard & Analytics | 67 |
| **Chapter 7** | **USER INTERFACE & EXPERIENCE** | 70 |
| 7.1 | Design Philosophy | 70 |
| 7.2 | Component Library (Shadcn/UI) | 72 |
| 7.3 | Navigation & Layout | 74 |
| 7.4 | Responsive Design | 76 |
| **Chapter 8** | **API & BACKEND SERVICES** | 78 |
| 8.1 | RESTful API Endpoints | 78 |
| 8.2 | Socket.IO Real-Time Services | 82 |
| 8.3 | Authentication Middleware | 85 |
| 8.4 | File Upload & Management | 87 |
| **Chapter 9** | **RESULTS & OUTCOMES** | 89 |
| 9.1 | Functional Outcomes | 89 |
| 9.2 | Technical Outcomes | 91 |
| 9.3 | Cultural & Social Impact | 93 |
| **Chapter 10** | **DEPLOYMENT & SETUP** | 95 |
| 10.1 | Installation Guide | 95 |
| 10.2 | Environment Configuration | 98 |
| 10.3 | Database Setup | 100 |
| **Chapter 11** | **FUTURE ENHANCEMENTS** | 103 |
| 11.1 | Planned Features | 103 |
| 11.2 | Research Opportunities | 105 |
| **Chapter 12** | **CONCLUSION** | 107 |
| | **REFERENCES** | 109 |
| | **APPENDICES** | 111 |

---

<div style="page-break-after: always;"></div>

## LIST OF FIGURES

| Figure No. | Title | Page |
|------------|-------|------|
| 1.1 | Ontological Database Architecture | 3 |
| 1.2 | HyperGraph Visualization Concept | 7 |
| 2.1 | Graph Database vs Relational Database | 12 |
| 2.2 | Ontology-Driven Knowledge Model | 14 |
| 2.3 | Web 3.0 Decentralized Architecture | 17 |
| 3.1 | System Requirements Diagram | 22 |
| 4.1 | Complete System Architecture | 27 |
| 4.2 | Frontend Component Hierarchy | 29 |
| 4.3 | Backend Service Architecture | 31 |
| 4.4 | Neo4j Graph Data Model | 33 |
| 4.5 | Three-Phase User Workflow | 35 |
| 5.1 | Technology Stack Overview | 38 |
| 5.2 | JWT Authentication Flow | 40 |
| 5.3 | Family Tree Builder UI | 42 |
| 5.4 | Cytoscape.js Graph Rendering | 44 |
| 5.5 | Database Layer Integration | 46 |
| 6.1 | Connected Trees Meta-Graph View | 49 |
| 6.2 | Tree Detail Dialog Interface | 50 |
| 6.3 | Meta-Graph Node Structure | 51 |
| 6.4 | AI Relationship Analyzer UI | 53 |
| 6.5 | Gemini API Integration Flow | 54 |
| 6.6 | Relationship Path Visualization | 55 |
| 6.7 | Chat System Architecture | 57 |
| 6.8 | Message Flow Diagram | 58 |
| 6.9 | Socket.IO Event Handling | 59 |
| 6.10 | Chat Interface Components | 61 |
| 6.11 | Message Storage Schema | 62 |
| 6.12 | WebRTC Architecture | 64 |
| 6.13 | Call Signaling Flow | 65 |
| 6.14 | Video Call UI Components | 66 |
| 6.15 | Dashboard Layout Structure | 68 |
| 6.16 | Analytics Visualization | 69 |
| 7.1 | Design System Components | 71 |
| 7.2 | Shadcn/UI Component Library | 73 |
| 7.3 | Sidebar Navigation Structure | 75 |
| 7.4 | Responsive Breakpoints | 77 |
| 8.1 | API Endpoint Architecture | 79 |
| 8.2 | Request/Response Flow | 80 |
| 8.3 | Socket.IO Connection Diagram | 83 |
| 8.4 | Real-Time Event System | 84 |
| 8.5 | JWT Middleware Flow | 86 |
| 8.6 | File Upload Pipeline | 88 |
| 10.1 | Deployment Architecture | 96 |
| 10.2 | Environment Setup Flowchart | 99 |
| 10.3 | Database Connection Diagram | 101 |

**Note:** All figures marked with **[ADD DIAGRAM HERE]** include detailed specifications for diagram creation.

---

<div style="page-break-after: always;"></div>

## LIST OF TABLES

| Table No. | Title | Page |
|-----------|-------|------|
| 3.1 | Domain Requirements Summary | 23 |
| 3.2 | Functional Requirements Matrix | 24 |
| 3.3 | Non-Functional Requirements | 25 |
| 5.1 | Technology Stack Breakdown | 38 |
| 5.2 | React Component Structure | 42 |
| 5.3 | Neo4j Node Types | 56 |
| 6.1 | Meta-Graph Features Comparison | 52 |
| 6.2 | AI Analyzer Capabilities | 55 |
| 6.3 | Chat System Features | 62 |
| 6.4 | WebRTC Supported Browsers | 66 |
| 8.1 | RESTful API Endpoints | 81 |
| 8.2 | Socket.IO Events List | 84 |
| 9.1 | Feature Completion Status | 90 |
| 9.2 | Performance Metrics | 92 |
| 10.1 | System Requirements | 97 |
| 10.2 | Environment Variables | 99 |
| 10.3 | Database Configuration | 102 |
| 11.1 | Planned Features Roadmap | 104 |

---

<div style="page-break-after: always;"></div>

# Chapter 1: INTRODUCTION

## 1.1 Project Context and Motivation

In today's interconnected digital era, social networking platforms have become vital tools for communication, community-building, and personal relationship management. Platforms like Facebook, Instagram, LinkedIn, and others have revolutionized how people connect across geographic, cultural, and demographic boundaries. However, these systems are largely rooted in Western models of individualism, focusing on one-to-one connections such as friends, followers, or professional contacts. This design fails to address the complexities inherent in Indian societal structures, which are deeply collective, multigenerational, and relationally interdependent.

### The Indian Context

India's social fabric is characterized by a unique blend of nuclear and joint family systems, extended familial ties, caste- and community-based affiliations, and culturally significant relationship roles such as:

- **Maternal uncles** (Mama) - Mother's brother with special significance
- **Paternal aunts** (Bua/Phupha) - Father's sister and her husband
- **Cross-cousin marriages** - Traditional in some communities
- **Joint family hierarchies** - Multi-generational living arrangements
- **Community-based relationships** - Gotra, clan, caste affiliations
- **Multi-generational households** - 3-4 generations living together
- **Extended family networks** - Dozens of recognized relationships
- **Ritual relationships** - Godparents, ceremonial bonds

These are not mere social labels but integral identity markers in personal and community life. Unfortunately, mainstream platforms are ill-equipped to model or visualize such intricate relationships.

### The Need for a New Solution

Moreover, the growing awareness of privacy risks and data misuse on centralized platforms has catalyzed a demand for decentralized, secure, and culturally responsive networking solutions. People seek digital spaces that:

1. **Prioritize data ownership** - Users control their own data
2. **Respect traditional social constructs** - Honor cultural relationships
3. **Offer flexible relationship mapping** - Support complex family structures
4. **Enable community building** - Connect families and communities
5. **Preserve heritage** - Document and maintain family history
6. **Provide security** - Protect sensitive family information
7. **Enable collaboration** - Real-time family interaction

### The ISN Solution

The **"India Social Network (ISN) - Bharat Roots Connect"** platform emerges as a transformative response to these gaps. It aims to go beyond the limitations of conventional graph-based social networks by incorporating:

- **Hypergraph theory** for multi-member associations
- **Combinatorial data structures** for complex hierarchies
- **AI-powered analysis** using Google Gemini 2.0 Flash
- **Real-time communication** with WhatsApp-like features
- **Cultural ontologies** for Indian relationship types
- **Decentralized architecture** for data sovereignty
- **Advanced visualization** with multiple view modes
- **Scalable technology** supporting millions of users

**[ADD DIAGRAM HERE: Ontological Database Architecture]**

**Diagram Specification:**
- **Type:** Layered architecture diagram
- **Layers (bottom to top):**
  1. Database Layer (Orange): Neo4j + MongoDB logos
  2. Combinatorial Layer (Green): Graph algorithms, path finding
  3. Ontological Layer (Blue): Cultural relationships, Indian kinship terms
  4. Application Layer (Purple): User interfaces, APIs
- **Connections:** Bidirectional arrows between layers
- **Size:** Full width, landscape orientation
- **Labels:** Clear layer names with icons
- **Color scheme:** Use isn-primary (#F59E0B) and isn-secondary colors

This creates a digital ecosystem capable of representing multi-member associations and complex relational hierarchies, ensuring users have complete control over their social data while maintaining compliance with India's Digital Personal Data Protection Act 2023.

---

<div style="page-break-after: always;"></div>

## 1.2 Challenges in Existing Platforms

Despite the widespread use of digital family trees and social networking apps, several structural, technical, and cultural limitations persist in existing models:

### 1.2.1 Limited Relationship Modeling

Traditional platforms are predominantly based on **"binary relationship modeling"**, such as parent-child, sibling, or spousal ties. These pairwise connections are insufficient in contexts where entire family clusters, joint ownership of assets, collective decision-making, and layered familial hierarchies are prevalent.

**Current Limitations:**

1. **Cannot represent cross-family marriages and relationships**
   - When two siblings from one family marry two siblings from another
   - Creates multiple relationship paths that tree diagrams cannot show

2. **No support for joint family structures**
   - Multiple heads of households
   - Collective property ownership
   - Shared decision-making authority

3. **Unable to model clan-based groupings**
   - Gotra affiliations
   - Caste-based community ties
   - Village or regional associations

4. **No support for role-based relations:**
   - **Jija/Sadu** - Brother-in-law (multiple types)
   - **Devrani/Jethani** - Wife of younger/elder brother-in-law
   - **Samdhi** - Relationship between parents of married couple
   - **Saali** - Wife's sister
   - **Sala** - Wife's brother

**Example Problem:**

In Indian families, a person might have multiple "uncles" with different relationship types and cultural significance:

| Relationship | Hindi Term | English | Cultural Significance |
|---|---|---|---|
| Father's younger brother | Chacha | Uncle | Close, often co-parenting role |
| Father's elder brother | Tau | Uncle | Senior, respect figure |
| Mother's brother | Mama | Uncle | Special bond, maternal side |
| Father's sister's husband | Phupha | Uncle-in-law | Through aunt |
| Mother's sister's husband | Mausa | Uncle-in-law | Maternal side |

Traditional platforms either flatten these to generic "uncle" or cannot represent them at all, losing crucial cultural context.

**ISN Solution:**

Our platform uses **hypergraph modeling** where:
- A single "hyperedge" can connect multiple nodes simultaneously
- Relationships carry rich metadata (type, cultural name, hierarchy, generation)
- Multi-parent and multi-guardian relationships are natively supported
- Community and group affiliations are first-class entities
- Supports 50+ predefined Indian relationship types
- Allows custom relationship definitions

---

### 1.2.2 Lack of Privacy and Decentralization

Most current platforms store all user data on centralized servers, exposing sensitive information to potential breaches, commercial exploitation, and unauthorized surveillance.

**Privacy Concerns:**

1. **Data Breaches** 
   - Centralized databases are attractive targets for hackers
   - Single point of failure for millions of users
   - History of major breaches (Facebook, LinkedIn, etc.)

2. **Commercial Exploitation**
   - Family data sold to advertisers
   - Behavioral tracking across platforms
   - Predictive analytics on personal life events

3. **Government Surveillance**
   - Potential for unauthorized access
   - Lack of transparency in data requests
   - Cross-border data transfer risks

4. **Limited User Control**
   - Users cannot truly delete their data
   - No control over data usage
   - Vendor lock-in

5. **Lack of Transparency**
   - Unknown how data is processed
   - Opaque algorithmic decisions
   - Hidden data sharing agreements

**Cultural Sensitivity:**

Given the personal nature of family data, particularly in cultures that value discretion and community honor, this centralization is a critical limitation. Indian families often discuss:

- **Property inheritance** - Wills, succession, disputes
- **Marriage negotiations** - Alliances, dowry, arrangements
- **Family disputes** - Conflicts, legal matters
- **Health issues** - Genetic conditions, mental health
- **Financial matters** - Loans, debts, investments
- **Social status** - Reputation, honor, community standing

All of which require maximum privacy and confidentiality.

**ISN Solution:**

We implement **Web 3.0 principles and DPDP Act 2023 compliance**:

1. **User-Controlled Data**
   - Users own their data completely
   - Granular permission controls
   - Right to data portability
   - Right to erasure

2. **Encryption**
   - End-to-end encryption for sensitive data
   - Encrypted data at rest (AES-256)
   - TLS 1.3 for data in transit

3. **Compliance**
   - DPDP Act 2023 (India)
   - Data localization options
   - Consent management
   - Audit trails

4. **Decentralized Options**
   - Optional peer-to-peer data sharing
   - Blockchain audit trails (planned)
   - Self-sovereign identity (planned)

---

### 1.2.3 Static Visualization Methods

Family trees on conventional platforms are typically represented through simple tree diagrams, which inherently lack flexibility.

**Current Limitations:**

1. **Fail to show multi-parent or multi-guardian relationships**
   - Adoptions with biological and adoptive parents
   - Remarriages creating blended families
   - Joint guardianship arrangements
   - Foster care situations

2. **Cannot reflect group-based ties or community linkages**
   - Village associations
   - Clan groups (Gotra)
   - Religious communities
   - Professional networks within families

3. **Struggle to handle recursive relationships**
   - Multiple relationship paths to same person
   - Example: Someone who is both your cousin AND brother-in-law
   - Consanguineous marriages (cousin marriages)

4. **Offer limited interaction**
   - No dynamic zooming
   - Cannot filter by relationship type
   - No temporal visualization
   - Static, non-explorable

**Example Problem:**

Consider this complex scenario:
1. **Person A** (male) marries **Person B** (female)
2. **Person A's brother** marries **Person B's sister**
3. Now their children are related in multiple ways:
   - First cousins through their fathers (brothers)
   - First cousins through their mothers (sisters)
   - This is called "double first cousins"

Traditional tree diagrams show only one path and miss the complete relationship picture.

**ISN Solution:**

We provide **five distinct visualization modes**, each optimized for different use cases:

1. **Traditional Tree View**
   - Hierarchical layout
   - Best for simple lineages
   - Top-down or left-right orientation
   - Print-friendly

2. **Graph Network View (Cytoscape.js)**
   - Force-directed layout
   - Shows all connections
   - Interactive exploration
   - Zoom, pan, search

3. **Hypergraph Meta-View** ⭐ NEW
   - Each family tree as a single node
   - Shows inter-tree connections
   - Simplifies complex networks
   - High-level overview

4. **Timeline View**
   - Chronological arrangement
   - Birth, marriage, death events
   - Historical perspective
   - Generation tracking

5. **Community View**
   - Group-based clustering
   - Geographic distribution
   - Relationship type filtering
   - Community analysis

**[ADD DIAGRAM HERE: Multiple Visualization Modes]**

**Diagram Specification:**
- **Type:** Multi-panel comparison diagram
- **Layout:** 2x3 grid showing all 5 views + legend
- **Panel 1:** Traditional tree (hierarchical, top-down)
- **Panel 2:** Graph network (circular force layout with colored nodes)
- **Panel 3:** Hypergraph meta-view (large family tree nodes connected)
- **Panel 4:** Timeline view (horizontal timeline with events)
- **Panel 5:** Community view (clustered groups by location/type)
- **Panel 6:** Legend and controls
- **Size:** Full page width
- **Annotations:** Labels for each mode, interaction hints (click, zoom, filter)
- **Colors:** Consistent color scheme across all views

All views support:
- **Interactive exploration** - Click, drag, zoom
- **Dynamic filtering** - By generation, relationship, location
- **Real-time updates** - Live collaboration
- **Fullscreen mode** - Distraction-free exploration
- **Export** - PNG, PDF, JSON

---

### 1.2.4 Limited Inter-Tree Connectivity

Users on current platforms are typically confined within isolated family units. However, in Indian society, multiple families are deeply interconnected through marriage, lineage, and caste-based relationships.

**Current Problems:**

1. **Isolated Family Units**
   - Each family tree exists in a silo
   - No cross-tree connections
   - Cannot trace extended networks
   - Lost family connections over time

2. **Lost Historical Connections**
   - Genealogical links fade over generations
   - Cannot trace ancestral villages
   - No record of historical family alliances
   - Migration patterns not documented

3. **Limited Discovery**
   - Cannot find distant relatives
   - No network exploration tools
   - Missing family reunion opportunities
   - Duplicate family trees

4. **Privacy vs. Connectivity Trade-off**
   - Connecting requires sharing all data
   - No granular controls
   - All-or-nothing approach
   - Security concerns

**Real-World Impact:**

In Indian culture, knowing your extended family network is crucial for:

- **Matrimonial alliances** - Avoiding close relations, finding suitable matches within community
- **Property matters** - Inheritance rights, succession planning, joint ownership
- **Social obligations** - Funerals, weddings, festivals require knowing extended family
- **Community identity** - Gotra verification, clan membership, caste associations
- **Historical research** - Genealogy, migration patterns, ancestral villages
- **Business networks** - Family businesses, partnerships, trust
- **Legal matters** - Witness requirements, succession laws

**ISN Solution:**

We introduce **Connected Trees Architecture with Hypergraph Meta-View**:

1. **Family Tree Interconnections**
   - Trees connect through marriage nodes
   - Bidirectional, verified connections
   - Maintains privacy boundaries
   - Connection history tracking

2. **Meta-Graph Visualization** ⭐ NEW FEATURE
   - View all connected trees at once
   - Each tree = single large node (180x180px)
   - Shows member count, connections
   - Click to explore individual trees
   - Fullscreen mode for large networks

3. **Connection Details**
   - Who connects to whom
   - Relationship types
   - Family Tree IDs
   - Connection approval status

4. **Granular Privacy Controls**
   - Choose what to share
   - Relationship-based permissions
   - Revocable access
   - Audit logs

**[ADD DIAGRAM HERE: Connected Trees Meta-Graph]**

**Diagram Specification:**
- **Type:** Network graph diagram
- **Central Node:** User's family tree (large gold/amber node with crown icon)
- **Connected Nodes:** 5-6 other family trees (blue nodes)
- **Node Size:** 180x180px circles
- **Node Content:**
  - Family Tree ID (e.g., "FT123")
  - Member count badge (e.g., "15 members")
  - Connection count (e.g., "3 connections")
  - Crown for user's tree
- **Edges:** Green lines with labels showing connection type
- **Edge Labels:** Person names who connect the trees
- **Layout:** Force-directed with user's tree in center
- **Legend:** Color coding for your tree vs connected trees
- **Statistics:** Total trees, total connections (top banner)
- **Interaction Hints:** "Click tree to view details"
- **Style:** Modern, clean, professional
- **Colors:** Amber for user tree, blue for others, green edges

This solves the fundamental limitation by enabling **network effects** while maintaining **privacy and control**.

---

