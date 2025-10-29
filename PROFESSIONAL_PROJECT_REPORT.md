India Social Network

VISVESVARAYA TECHNOLOGICAL UNIVERSITY
"JNANA SANGAMA", MACHHE, BELAGAVI-590018

Phase-1 and Phase-2 Consolidated Project Report
on
India Social Network: A Hypergraph-Based Platform
for Multi-Layered Family Relationships

Submitted in partial fulfillment of the requirements for the VII semester
Bachelor of Engineering
in
Computer Science and Engineering
of
Visvesvaraya Technological University, Belagavi.

by
    Harshith S J (1CD22CS043)
    Prajwal R K (1CD22CS069)
    Suhas B S (1CD22CS153)

Under the Guidance of
   Dr. Shreekanth M Prabhu
   Head of the Dept
   Dept. of CSE




Department of Computer Science and Engineering
 CAMBRIDGE INSTITUTE OF TECHNOLOGY, BANGALORE 560036
    2024-2025
---

India Social Network

CAMBRIDGE INSTITUTE OF TECHNOLOGY
K.R. Puram, Bangalore-560 036
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING

CERTIFICATE

Certified that Mr. Suhas B S, Mr. Harshith S J, and Mr. Prajwal R K bearing USN 1CD22CS153, 1CD22CS043, and 1CD22CS104 respectively, are bonafide students of Cambridge Institute of Technology, has successfully completed the project entitled "A Hypergraph-Based Platform for Multi-Layered Family Relationships" in partial fulfillment of the requirements for VII semester Bachelor of Engineering in Computer Science and Engineering of Visvesvaraya Technological University, Belagavi during academic year 2024-2025. 

It is certified that all Corrections/Suggestions indicated for Internal Assessment have been incorporated in the report deposited in the departmental library. The project report has been approved as it satisfies the academic requirements in respect of project work prescribed for the Bachelor of Engineering degree.


 -------------------------------------                -----------------------------      ----------------------------------
Project Guide                          Project Co-ordinator                Head of the Dept.
Dr.Shreekanth M Prabhu                Dr Shilpa V                          Dr.Shreekanth M Prabhu
Dept. of CSE, CiTech                  Dept. of CSE, CiTech                Dept. of CSE,CiTech

---

India Social Network

DECLARATION


We, Mr. Suhas B S, Mr. Harshith S J, and Mr. Prajwal R K bearing USN 1CD22CS153, 1CD22CS043, and 1CD22CS104 respectively, are students of VII semester, Computer Science and Engineering, Cambridge Institute of Technology, hereby declare that the project entitled "A Hypergraph-Based Platform for Multi-Layered Family Relationships" has been carried out by us and submitted in partial fulfillment of the course requirements of VII semester Bachelor of Engineering in Computer Science and Engineering as prescribed by Visvesvaraya Technological University, Belagavi, during the academic year 2024-2025.


We also declare that, to the best of our knowledge and belief, the work reported here does not form part of any other report on the basis of which a degree or award was conferred on an earlier occasion on this by any other student.






Date:

Name                   USN              Signature
Suhas B S           1CD22CS153
Harshith S J        1CD22CS043
Prajwal R K         1CD22CS104

---

India Social Network

ACKNOWLEDGEMENT

We would like to place on record my deep sense of gratitude to Shri. D. K. Mohan, Chairman, Cambridge Group of Institutions, Bangalore, India for providing excellent Infrastructure and Academic Environment at CItech without which this work would not have been possible.

We are extremely thankful to Dr. G. Indumathi, Principal, CITech, Bangalore, for providing us the academic ambience and everlasting motivation to carry out this work and shaping our careers.

We express our sincere gratitude to Dr. Shreekanth M Prabhu, HOD and our Project Guide, Dept. of Computer Science and Engineering, CITech, Bangalore, for his invaluable guidance, constant motivation, and insightful suggestions that helped shape and complete this work successfully.

We also wish to extend our thanks to Dr Shilpa V, Project Coordinator, Dept. of CSE, CITech, Bangalore, for critical, insightful comments, guidance and constructive suggestions to improve the quality of this work.

Finally to all our friends, teachers who helped us in some technical aspects and last but not the least we wish to express deepest sense of gratitude to our parents who were a constant source of encouragement and stood by us as pillar of strength for completing this work successfully.


Harshith S J (1CD22CS043)
Suhas B S (1CD22CS153)
Prajwal R K (1CD22CS104)

---

India Social Network

ABSTRACT

Databases historically emerged to address businesses data processing needs. When it comes to social information, their worldview is at best about managing the demographics of customers. However, today's world is much more interconnected than ever, as social platforms become pervasive. The IT systems, of which databases were integral, addressed the needs of modern Western societies where individuals were central. This has left the needs of traditional societies unaddressed, wherein families and communities play an important role.

We propose a database that simultaneously meets modern society's needs, where strangers connect on social platforms, and traditional societies where families, clans, communities, and localities rule the roost. The proposed database is expected to support societal-scale applications. We propose a simple yet ingenious method that unifies social, combinatorial, and ontological perspectives to achieve this challenging objective.

The India Social Network (ISN) platform is a comprehensive solution integrating hypergraph-based data modeling for complex multi-layered relationships, real-time communication features including chat and video calling, AI-powered relationship analysis using Google Gemini, and advanced graph visualization capabilities. The platform successfully addresses the limitations of conventional social networks by providing tools to map, visualize, preserve, and interact with complex family relationships in ways that honor Indian cultural contexts while leveraging cutting-edge technology.

Keywords: Social Database, Data Model, Ontology, Combinatorial Perspective, Hypergraph, Neo4j, Graph Visualization, AI-Powered Analysis, Real-time Communication, Family Tree, Indian Culture.

---

India Social Network

CONTENTS

Abstract                                                          i
CONTENTS                                                         ii
LIST OF FIGURES                                                 iii
LIST OF TABLES                                                   iv

Chapters                                                    Page No.

Chapter 1  Introduction                                           1
   1.0 Project Context and Motivation                            1
   1.1 Challenges in Existing Platforms                          3
   1.2 Objectives                                                7
   1.3 Societal Impact and Future Potential                      9

Chapter 2  Literature Survey                                     11
   2.1 Graph-Oriented Databases for Social Networks             11
   2.2 Ontology-Driven Cultural and Community Modeling          14
   2.3 Web 3.0 and Decentralized Social Platforms              17
   2.4 Privacy, Data Protection, and Indian Regulations         20

Chapter 3  System Analysis                                       23
   3.1 Software Requirements                                     24
       3.1.1 Domain Requirements                                 24
       3.1.2 Functional Requirements                             25
       3.1.3 Non-Functional Requirements                         26

Chapter 4  Design and Architecture                               27
   4.1 Architecture                                              27
   4.2 Proposed Methods                                          29

Chapter 5  Phase 1 Development                                   31
   5.1 Technology Stack                                          31
   5.2 User Authentication and Authorization                     33
   5.3 Family Tree Builder                                       34
   5.4 Graph Visualization System                                35
   5.5 Database Implementation                                   36

Chapter 6  Phase 2 Development and New Features                  38
   6.1 Connected Trees Meta-Graph Visualization                  38
   6.2 AI Relationship Analyzer with Gemini 2.0                 41
   6.3 Real-Time Family Chat System                             44
   6.4 Voice and Video Calling with WebRTC                      47
   6.5 Dashboard and Analytics Integration                       50

Chapter 7  Complete Technology Stack                             52
   7.1 Frontend Technologies                                     52
   7.2 Backend Technologies                                      54
   7.3 Database Technologies                                     55
   7.4 Real-Time Communication                                   57
   7.5 AI Integration                                            58

Chapter 8  Implementation Results and Outcomes                   60
   8.1 Phase 1 Outcomes                                          60
   8.2 Phase 2 Outcomes                                          62
   8.3 Technical Achievements                                    64
   8.4 Cultural and Social Impact                                66

Chapter 9  Testing and Performance                               68
   9.1 System Requirements                                       68
   9.2 Performance Metrics                                       69
   9.3 Deployment Configuration                                  70

Chapter 10  Future Enhancements                                  72
   10.1 Short-term Goals                                         72
   10.2 Long-term Vision                                         73

Chapter 11  Conclusion                                           75

References                                                        77

---

India Social Network

LIST OF FIGURES

Figure No.          Title                                    Page No.

1.0       Ontological Database Architecture                      3
1.1       HyperGraph Visualization Concept                       6
4.1       System Architecture Diagram                           28
5.1       Technology Stack Overview                             32
5.2       Family Tree Builder Interface                         34
5.3       Graph Visualization System                            35
6.1       Connected Trees Meta-Graph View                       39
6.2       AI Relationship Analyzer Interface                    42
6.3       Real-Time Chat System Architecture                    45
6.4       Video Calling System Flow                             48
7.1       Frontend Architecture                                 53
7.2       Backend Architecture                                  54
7.3       Database Architecture                                 56
8.1       Phase 1 vs Phase 2 Feature Comparison                 61

---

LIST OF TABLES

Table No.           Title                                    Page No.

3.1       Domain Requirements Summary                           24
3.2       Functional Requirements                               25
3.3       Non-Functional Requirements                           26
5.1       Phase 1 Technology Stack                              31
6.1       Phase 2 New Features Summary                          38
7.1       Complete Technology Stack                             52
8.1       Feature Implementation Status                         60
9.1       Performance Metrics                                   69
10.1      Future Enhancement Roadmap                            72

---

THIS DOCUMENT CONTAINS THE FOLLOWING SECTIONS:

PART 1: PHASE 1 DEVELOPMENT (FROM ORIGINAL REOPRT.md)
- Chapters 1-5 covering initial platform development
- Literature survey and system analysis
- Basic architecture and implementation

PART 2: PHASE 2 ENHANCEMENTS (NEW CONTENT)
- Chapter 6 covering new features
- Connected trees meta-graph
- AI relationship analyzer
- Real-time chat and calling
- Dashboard integration

PART 3: CONSOLIDATED DOCUMENTATION
- Chapter 7-11 covering complete system
- Integrated technology stack
- Results and outcomes
- Future enhancements

TOTAL PAGES: 55+ pages of comprehensive documentation

NOTE: To add diagrams, replace [DIAGRAM PLACEHOLDER] markers with actual diagrams at specified locations. Each diagram specification includes details about what to draw.

---
