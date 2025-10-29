 India Social Network 
 
VISVESVARAYA TECHNOLOGICAL UNIVERSITY 
"JNANA SANGAMA" ,MACHHE, BELAGAVI-590018 
 
Phase-1 Project Report 
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
 India Social Network 
 
CAMBRIDGE INSTITUTE OF TECHNOLOGY 
K.R. Puram, Bangalore-560 036 
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING 
 
CERTIFICATE 
Certified that Mr. Suhas B S, Mr. Harshith S J, and Mr. Prajwal R K bearing USN 
1CD22CS153, 1CD22CS043, and 1CD22CS104 respectively, are bonafide students of 
Cambridge Institute of Technology, has successfully completed the project entitled “A 
Hypergraph-Based Platform for Multi-Layered Family Relationships “ in partial fulfillment 
of the requirements for VI semester Bachelor of Engineering in Computer Science and 
Engineering of Visvesvaraya Technological University, Belagavi during academic year 
2024-2025. It is certified that all Corrections/Suggestions indicated for Internal Assessment 
have been incorporated in the report deposited in the departmental library. The project report 
has been approved as it satisfies the academic requirements in respect of project work prescribed 
for the Bachelor of Engineering degree. 
 
 
 -------------------------------------                -----------------------------      ---------------------------------- 
Project Guide              Project Co-ordinator     Head of the Dept. 
Dr.Shreekanth M Prabhu  Dr Shilpa V       Dr.Shreekanth M Prabhu 
Dept. of CSE, CiTech             Dept. of CSE, CiTech     Dept. of CSE,CiTech 
 India Social Network 
 
DECLARATION 
 
 
We, Mr. Suhas B S, Mr. Harshith S J, and Mr. Prajwal R K bearing USN 1CD22CS153, 
1CD22CS043, and 1CD22CS104  respectively, are students of VI semester, Computer Science 
and Engineering, Cambridge Institute of Technology, hereby declare that the project entitled 
“A Hypergraph-Based Platform for Multi-Layered Family Relationships “ has been carried 
out by us and submitted in partial fulfillment of the course requirements of VI semester 
Bachelor of Engineering in Computer Science and Engineering as prescribed by 
Visvesvaraya Technological University, Belagavi, during the academic year 2024-2025. 
 
 
We also declare that, to the best of our knowledge and belief, the work reported here 
does not form part of any other report on the basis of which a degree or award was conferred 
on an earlier occasion on this by any other student. 
 
 
 
 
 
 
Date: 
 
Name USN Signature 
Suhas B S 1CD22CS153  
Harshith S J 1CD22CS043  
Prajwal R K 1CD22CS104  
 India Social Network 
 
ACKNOWLEDGEMENT 
We would like to place on record my deep sense of gratitude to Shri. D. K. Mohan, Chairman, 
Cambridge Group of Institutions, Bangalore, India for providing excellent Infrastructure and 
Academic Environment at CItech without which this work would not have been possible. 
 
 
We are extremely thankful to Dr. G. Indumathi, Principal, CITech, Bangalore, for providing 
us the academic ambience and everlasting motivation to carry out this work and shaping our 
careers. 
 
 
We express our sincere gratitude to Dr. Shreekanth M Prabhu, HOD and our Project Guide, 
Dept. of Computer Science and Engineering, CITech, Bangalore, for his invaluable guidance, 
constant motivation, and insightful suggestions that helped shape and complete this work 
successfully. 
 
 
We also wish to extend our thanks to Dr Shilpa V, Project Coordinator, Dept. of CSE, CITech, 
Bangalore, for critical, insightful comments, guidance and constructive suggestions to improve 
the quality of this work. 
 
 
 
Finally to all our friends, teachers who helped us in some technical aspects and last but not the 
least we wish to express deepest sense of gratitude to our parents who were a constant source 
of encouragement and stood by us as pillar of strength for completing this work successfully. 
 
 
Harshith S J (1CD22CS043) 
Suhas B S (1CD22CS153)  
Prajwal R K (1CD22CS104) 
 India Social Network 
 
ABSTRACT 
 
Databases historically emerged to address businesses data processing needs. When it 
comes to social information, their worldview is at best about managing the demographics of 
customers. However, today’s world is much more interconnected than ever, as social platforms 
become pervasive. The IT systems, of which databases were integral, addressed the needs of 
modern Western societies where individuals were central. This has left the needs of traditional 
societies unaddressed, wherein families and communities play an important role. We propose 
a database that simultaneously meets modern society's needs, where strangers connect on social 
platforms, and traditional societies where families, clans, communities, and localities rule the 
roost. The proposed database is expected to support societal-scale applications. We propose a 
simple yet ingenious method that unifies social, combinatorial, and ontological perspectives to 
achieve this challenging objective. 
Keywords — Social Database, Data Model, Ontology, Combinatorial Perspective.  
 India Social Network 
 
CONTENTS 
 
Abstract          i 
CONTENTS         ii 
LIST OF FIGURES        iii 
 
Chapters      Page.no 
 
Chapter 1  Introduction      1 
   1.0 Project Context and Motivation                         1 
   1.1 Challenges in Existing Platforms                       2 
   1.2 Objectives                                                           4 
   1.3 Societal Impact and Future Potential                  6 
Chapter 2  Literature  survey     7 
 
   Chapter 3  System Analysis          13 
   3.1 Software requirements    10 
   Chapter 4  Design Flow       16 
   4.1 Architecture      16 
   4.2 Proposed Methods     17 
   Chapter 5    Expected Outcome     19 
       References       21 
 
 
 India Social Network 
 
 
List of Figures 
Figure no    Name          page no 
    1.0                    Ontological Database Architecture            02 
    1.2                         HyperGraph Visualization                     05 
    4.1            Architecture                       16 
 
     
 
  
    
India Social Network 
Chapter 1 
Introduction 
1.0  Project Context and Motivation 
In today’s interconnected digital era, social networking platforms have become 
vital 
tools for communication, community-building, and personal relationship 
management. These platforms—Facebook, Instagram, LinkedIn, and others—have 
revolutionized how people connect across geographic, cultural, and demographic 
boundaries. However, these systems are largely rooted in Western models of 
individualism, focusing on one-to-one connections such as friends, followers, or 
professional contacts. This design fails to address the complexities inherent in Indian 
societal structures, which are deeply collective, multigenerational, and relationally 
interdependent. 
India's social fabric is characterized by a unique blend of nuclear and joint family 
systems, extended familial ties, caste- and community-based affiliations, and culturally 
significant relationship roles such as maternal uncles, paternal aunts, and cross-cousin 
marriages. These are not mere social labels but integral identity markers in personal and 
community life. Unfortunately, mainstream platforms are ill-equipped to model or 
visualize such intricate relationships. 
Moreover, the growing awareness of privacy risks and data misuse on centralized 
platforms has catalyzed a demand for decentralized, secure, and culturally responsive 
networking solutions. People seek digital spaces that prioritize data ownership, respect 
traditional social constructs, and offer flexible ways to document and engage with their 
family and community relationships. 
The “India Social Network (ISN)” platform emerges as a transformative response 
to these gaps. It aims to go beyond the limitations of conventional graph-based social 
networks by incorporating hypergraph theory and combinatorial data structures. By doing 
so, it creates a digital ecosystem capable of representing multi-member associations and 
complex relational hierarchies, ensuring users have complete control over their social data 
while maintaining compliance with the latest Indian data protection laws. 
1 
B.E., Dept of CSE, CITech                                             
2024-25                                                                 
India Social Network 
Fig 1.0 Ontological Database Architecture   
1.1 Challenges in Existing Platforms 
Despite the widespread use of digital family trees and social networking apps, several 
structural, technical, and cultural limitations persist in existing models: 
1.1.1   Limited Relationship Modeling 
Traditional platforms are predominantly based on “binary relationship 
modeling”, such as parent-child, sibling, or spousal ties. These pairwise 
connections are insufficient in contexts where entire family clusters, joint 
ownership of assets, collective decision-making, and layered familial 
hierarchies are prevalent. They cannot represent: 
•  Cross-family marriages and relationships. 
• Joint family structures with multiple heads of households. 
• Clan-based groupings with communal histories and Role-based relations 
like “co-brother,” “uncle-in-law,” or “maternal aunt’s son.” 
2024-25                                                            
      2 
B.E., Dept of CSE, CITech                                             
India Social Network 
1.1.2 Lack of Privacy and Decentralization 
Most current platforms store all user data on centralized servers, 
exposing sensitive information to potential breaches, commercial exploitation, 
and unauthorized surveillance. This centralization also means users often have 
limited control over their data, with little transparency in how it is used or 
shared. Given the personal nature of family data, particularly in cultures that 
value discretion and community honor, this is a critical limitation. 
1.1.3   
Static Visualization Methods 
Family trees on conventional platforms are typically represented 
through simple tree diagrams, which inherently lack flexibility. These 
structures: 
• Fail to show multi-parent or multi-guardian relationships. 
• Cannot reflect group-based ties or community linkages. 
• Struggle to handle recursive relationships (e.g., multiple relations to the 
same person). 
• Offer limited zooming, interaction, or dynamic changes as relationships 
evolve. 
1.1.4 Limited Inter-Tree Connectivity 
Users on current platforms are typically confined within isolated 
family units. However, in Indian society, multiple families are deeply 
interconnected through marriage, lineage, and caste-based relationships. The 
inability to visualize these “inter-tree relationships” restricts users' ability to 
trace genealogies and understand familial history beyond immediate relatives. 
Existing models lack dynamic visualization tools for representing extended 
family connections, making it difficult to document evolving relationships 
over generations. Additionally, centralized data storage limits privacy controls 
and secure inter-family linking, necessitating a hypergraph-based solution that 
Enhances relationship exploration and digital lineage mapping. 
2024-25                                                                 
3 
B.E., Dept of CSE, CITech                                             
India Social Network 
1.2 Objectives
 The overarching goal of  the  “India Social Network (ISN) - A Hypergraph
Based Platform for Multi-Layered Family Relationships”  is to build a trusted, secure, 
decentralized, and culturally adaptive platform for mapping and interacting with complex 
social relationships. By aligning technological innovation with the socio-cultural needs of 
Indian society, ISN seeks to enable users to build, visualize, and preserve their family and 
community networks in meaningful ways.  
This platform is not merely a family tree builder it is a “holistic social 
infrastructure” that supports real-time updates, dynamic interactions, intelligent 
relationship suggestions, and privacy-first data architecture. 
1.2.1 Key Objectives 
▪ Create a   Family Tree and Social Network 
• Allow users to register and build family trees by defining culturally specific 
relationships such as “cousin sister from maternal side,” “eldest paternal 
uncle,” etc. 
• Enable users to link with other family trees, forming a dynamic mesh of 
social networks, subject to verified user approvals. 
• Implement privacy-by-design principles, ensuring each relationship, 
image, or personal record is protected by custom access control layers. 
• Provide an intuitive,  graphical user interface for users of all ages to interact 
with their family and social history—through timelines, maps, or relation 
graphs. 
▪ Integrate Web 3.0 Decentralization for Security and Trust 
•  Employ blockchain and distributed ledger technologies (DLT) to store 
critical relationship data, ensuring transparency and tamper-proof history 
logs. 
•  Use  Self-Sovereign Identity protocols to empower users with full control 
• over their digital identity without needing to rely on platform providers. 
2024-25                                                                  
4 
B.E., Dept of CSE, CITech                                             
India Social Network 
• Comply with India’s evolving Digital Personal Data Protection (DPDP) 
Act, 2023, and its upcoming 2025 amendments, offering legal assurance to 
users on data sovereignty and processing.  
▪ Develop a Hypergraph Visualization Module 
Fig 1.2 
• Move beyond basic trees by adopting hypergraph models, where a single 
edge (or “hyperedge”) can connect multiple nodes. This allows modeling 
of: 
• Joint family ownership. 
• Community-based relations. 
•   Ritual-based relationships (e.g., godparents, ceremonial roles). 
• Introduce AI-driven suggestions that propose potential links based on 
cultural norms, common naming conventions, or genealogical patterns. 
• Offer layered visualization options, allowing users to toggle between 
nuclear, extended, community, or lineage-based views. 
▪  Implement a Scalable Combinatorial Database Architecture 
• Use Neo4j or similar graph-based databases optimized for high-volume 
• relationship storage, traversal, and querying. 
2024-25                                                            
      5 
B.E., Dept of CSE, CITech                                             
India Social Network 
• Design a combinatorial backend  that accommodates: 
o Nested familial structures. 
o Time-based events ( births, marriages, migrations). 
o Cross-linking with historical or religious databases (e.g., Gotra or 
caste registries). 
• Ensure horizontal scalability, allowing millions of users to interact 
simultaneously without performance degradation. 
1.3 Societal Impact and Future Potential 
By delivering on its vision, the ISN platform has the potential to: 
• Serve as a digital heritage repository, preserving oral histories, family legacies, and 
ancestral knowledge for future generations. 
• Enable smart matchmaking systems based on community, health, or lineage factors, 
particularly relevant in traditional matrimonial practices. 
• Offer academic and sociological research insights by analyzing anonymized 
relationship networks across regions, religions, and languages. 
• Integrate with governmental or legal frameworks for identity verification, property 
rights, or inheritance claims. 
2024-25                                                            
      6 
B.E., Dept of CSE, CITech                                             
India Social Network 
Chapter 2 
Literature Survey 
Designing a social network for India requires specialized data models and 
awareness of cultural context. Modern social networks naturally form graphs of users 
and relationships, making graph databases a fitting backend choice. Graph databases 
store entities as nodes and relationships as edges, enabling efficient traversal of social 
connections. Unlike rigid relational schemas, graph databases (e.g. Neo4j) scale to the 
massive, evolving networks typical of social media. Besta et al. (2023) note that real
world social networks can involve “trillions of edges” with rich vertex/edge data, and 
systems like Neo4j are explicitly built to store and analyze such large, evolving 
graphs. Likewise, relational designs strain under highly interconnected social data – 
modeling Facebook or Twitter in SQL incurs “large number of joins” and poor 
performance, whereas graph databases store user connections natively. 
2.1 Graph-Oriented Databases for Social Networks 
Graph databases model data as networks, which is especially suited to social 
platforms. In graph DBs, entities (users, pages, etc.) are nodes, and relationships 
(friendships, memberships) are edges. This approach contrasts with relational tables: 
in a graph store, fetching a user’s friends only traverses edges, whereas in SQL it 
requires complex joins across tables. As Batra & Tyagi (2012) explain, social 
networks exhibit “complicated networks of relationships” that defeat relational joins; 
graph DBs overcome this by making relationships first-class so they can be traversed 
in constant time per edge. 
Modern graph DB systems (e.g. Neo4j, JanusGraph, Amazon Neptune) 
implement efficient index-free adjacency and graph-optimized query languages. Besta 
et al. (2023) surveyed such systems and highlight that property graph databases like 
Neo4j enable high-performance storage and querying of “large, evolving, and rich” 
social graphs. These systems support dynamic schemas (adding new relationship types 
without migration) and ACID or eventual-consistent transactions.  
7 
B.E., Dept of CSE, CITech                                            
2024-25                                                                 
India Social Network 
They also integrate graph query languages (Cypher, Gremlin, SPARQL) and graph 
algorithms (shortest-path, community detection). For example, Neo4j’s Cypher can 
rapidly answer friend-of-friend or mutual-friend queries by pattern matching graph paths. 
Given India’s scale, distributed graph stores are attractive. IBM’s patented system 
US12045283B2 explicitly targets “distributed graph databases” for social applications. In 
that patent, IBM describes a professional social network use-case and an ingestion engine 
for a partitioned graph DB. Graphite Systems’ US11562442 patent similarly anticipates 
complex social graphs: it describes a “compound social network graph” that can represent 
multi-level organizational ties by using “compound edges” to model nested profile data. 
These patents underscore that real-world social networks often involve layered 
connections (e.g. family-business-community ties) and require graph schemas to capture 
them. 
2.2 Ontology-Driven Cultural and Community Modeling 
Beyond low-level data storage, ontologies and knowledge graphs can model the 
cultural and social semantics in the network. An ontology is an explicit formal schema of 
concepts and relationships; in a social network context, ontologies can represent cultural 
categories (e.g. festivals, caste, kinship roles) and community structures. Ontologies can 
enrich user profiles, enable semantic search, and support recommendations respecting 
cultural context. For example, Raj et al. (2022) developed an “Indian culture” ontology 
and knowledge base, capturing diverse cuisines, festivals, rituals, and places in India. Their 
system used RDF to link data from disparate web pages into a machine-readable form. As 
they note, ontology models “link the data, convert it into machine-readable form, validate 
and infer new knowledge”. Thus a cultural ontology allows the platform to, say, relate 
users by shared festival interest or to suggest culturally-relevant content. 
From a community perspective, ontology design must consider social context. De 
Moor et al. (2018) propose a Community Network Ontology, stressing that ontologies “are 
inseparable from the communities” that create them. They argue for a community-centric 
approach: community members should help define the ontology. Their work suggests that 
a flexible “mapping language” grounded in social epistemology is needed so that each 
community (e.g. a village, an interest group) can customize its ontology.
 2024-25                                                             
    8 
B.E., Dept of CSE, CITech                                            
India Social Network 
Peter Mika (2005) advocated a related idea: he proposed a tripartite model linking 
actors, concepts, and instances in a semantic social network. In “Ontologies Are Us,” Mika 
emphasized that ontologies emerge from social tagging and meaning shared by users. This 
“emergent semantics” view suggests that the Indian platform could mine its own social 
graph to evolve ontologies (e.g. community-driven hashtags or folksonomies). It 
highlights that the system should link social network data with semantic web standards 
(FOAF for user profiles, SIOC for forums, etc.) to enable interoperability. In sum, 
ontology-driven modeling enables the platform to encode cultural knowledge explicitly 
and drive features like semantic search, recommendations, and data linking. 
India’s social network design must account for collectivist and hierarchical social 
structures. Indian society is traditionally collectivist: extended families and community 
bonds often take precedence over the individual. Chadda and Deb (2013) emphasize this 
point: “Indian society is collectivistic and promotes social cohesion and interdependence.” 
In India, the joint family (multi-generational household) historically “follows the same 
principles of collectivism” and serves as a social support structure. Even as joint families 
give way to nuclear families, familial networks remain central. This implies that the social 
platform should emphasize group identity and family links (for example, allowing easy 
connection of relatives or community groups), reflecting how Indians prioritize family and 
community ties. 
Moreover, India’s social stratifications (e.g. caste, religion, region) often influence 
networking. Communities may form around shared caste identity or hometown, and 
cultural events (festivals, religious gatherings) reinforce ties. The ontology discussed 
earlier can help here by explicitly encoding such categories and by enabling group-based 
recommendations (e.g. suggesting local festivals or caste-based community pages to users 
with matching profiles). Also, high power distance is typical in India (respect for 
hierarchy), which might influence platform features such as how user roles are displayed 
(e.g. allowing clan elders or community leaders recognition).  
2024-25                                                             
    9 
B.E., Dept of CSE, CITech                                            
India Social Network 
Collectivist orientation also affects privacy and sharing: individuals may expect 
their family network to have more access to their information than strangers. The platform 
should allow fine-grained group-based sharing reflecting this pattern. Overall, 
acknowledging these sociocultural dimensions (as studied in Indian psychology and 
anthropology) ensures the network aligns with local expectations of loyalty, 
interdependence, and group harmony.  
2.3 Web 3.0 and Decentralized Social Platforms 
Web 3.0 shifts social networks toward decentralization, peer-to-peer protocols, and 
user-controlled data. In this vision, instead of a single corporate server, social media runs 
on a federation of independently operated servers (“instances”) all speaking a common 
protocol. A prime example is the Fediverse, a network of federated platforms (e.g. 
Mastodon, Pleroma, Pixelfed) using the W3C’s ActivityPub standard. Users join a single 
instance but can interact with users on others. Abbing and Gehl (2024) explain that 
ActivityPub “makes up a larger network of social platforms known as the ‘fediverse’,” 
highlighting that Mastodon and similar projects form a distributed social web. In this 
model, instances vary widely – from volunteer-run servers to academic or corporate nodes – each with its own governance and culture. 
Similarly, blockchain-based networks offer decentralized social media. Platforms 
like Steemit or Hive use cryptocurrency tokens to incentivize content creation in a 
trustless, distributed manner. Users store content on the blockchain or on distributed 
storage (IPFS), and transactions (posts, votes) go into public ledgers. While explicit 
academic citations for these are limited, the trend is recognized: blockchains provide 
“trustless” infrastructure for social networking, potentially giving users ownership over 
their data and earnings. 
In any Web3 approach, the key idea is removing a single point of control. La Cava 
et al. (2021) note that decentralized online social networks (DOSNs) allow users to set up 
their own servers and still form one “massive social network” via a common protocol. This 
aligns with the fediverse model. . For an Indian platform, a federated or blockchain 
architecture could enhance resilience, resist censorship, and empower user privacy. For 
example, a Web3 network might allow users to publish content under an Indian domain 
2024-25                                                            
      10 
B.E., Dept of CSE, CITech                                             
India Social Network 
that is nonetheless mirrored on nodes internationally, or use self-sovereign identity (DIDs) 
so each person controls their profile data. 
Example (Fediverse): Users can host their own nodes. La Cava et al. (2021) explain 
that in DOSNs, “users can set up their own server, or instance, while they can interact with 
users of other instances.” All these instances adopt a common protocol (e.g. ActivityPub), 
making them part of one large network – the Fediverse. Abbing & Gehl also note that the 
Fediverse is culturally diverse (many instances focused on minority groups, etc.). This 
suggests that an Indian decentralized network could have instances tailored to local 
languages and cultures. 
In summary, Web 3.0 approaches (federation, blockchain, peer-to-peer) offer a 
technical foundation for decentralization. Incorporating these ideas, the platform might 
use a federation (like a Mastodon variant) or blockchain-backed identity and rewards. 
These lend themselves well to an Indian context where distrust of centralized control is 
high and local digital autonomy (e.g. data sovereignty) is valued. 
2.4 Privacy, Data Protection, and Compliance with Indian Regulations 
Any social network must embed privacy and legal compliance by design. In India, 
laws and rules are rapidly evolving. The Supreme Court declared privacy a fundamental 
right (2017), and in 2023 India passed a new Digital Personal Data Protection Act. Under 
this framework, social network operators become data fiduciaries with duties: they must 
implement security safeguards, maintain data accuracy, notify authorities of breaches, and 
delete user data if consent is withdrawn. Although the final DPDP law reduced some 
obligations compared to earlier drafts, key principles remain (informed consent, purpose 
limitation, etc.). 
Besides the DPDP Act, the platform must heed India’s IT Rules, 2021 for 
intermediaries. These rules require social media and OTT apps to trace the originator of 
messages in certain cases. They also mandate appointing compliance officers in India and 
prompt removal of illegal content. In practice, this means the network’s architecture should 
allow content provenance tracking (e.g. logging which user posted what), in case 
authorities demand it, while still protecting general privacy. 
2024-25                                                            
      11 
B.E., Dept of CSE, CITech                                             
India Social Network 
Sector-specific regulations also matter. For instance, the Reserve Bank of India 
often requires localization of financial data, and similar rules have applied to health or 
telecommunications. As Carnegie analysts point out, while the DPDP Act itself does not 
enforce localization, many Indian agencies do. Thus, the network’s infrastructure may 
need to ensure user data is stored on Indian soil if required. The design should also support 
user rights under Indian law (e.g. the right to erasure, the ability to correct profile data). 
In summary, the platform must incorporate robust privacy controls. Data 
encryption (in transit and at rest), access controls, and consent management are essential. 
Logging and monitoring for compliance (e.g. data protection audits) will also be needed. 
By adopting privacy-by-design principles, the network can satisfy India’s legal 
framework, which emphasizes user consent, data minimization, and accountability.
 2024-25                                                            
      12 
B.E., Dept of CSE, CITech                                             
India Social Network 
Chapter 3 
System Analysis 
The proposed social platform emerges from a critical analysis of existing social media 
platforms, which, primarily originating from a Western cultural context, struggle to 
adequately address the unique societal structures and collectivist values prevalent in 
traditional societies like India. The current landscape exhibits limitations in effectively 
facilitating strong in-group bonds, hierarchical relationships, and handling the complex, 
dynamic, and interconnected nature of Indian social life. Furthermore, concerns regarding 
misinformation, cyberbullying, user privacy, and the potential erosion of traditional cultural 
values underscore the urgent need for a tailored solution.  
This novel, non-financial Web 3.0 social platform is specifically designed for India. 
Its core objective is to conceive a database that unifies social, combinatorial, and ontological 
perspectives to organize the intricate structures of Indian society, including families, 
communities, localities, and work groups. This approach aims to support societal-scale 
applications, enabling comprehensive analysis from individual family units to broader 
national structures. 
The architectural foundation of the platform will comprise a Social Network and 
Hypergraph Visualization Module and a Combinatorial Database Module. The data 
modeling will be underpinned by an ontological approach, which is crucial for capturing 
the rich semantic nuances inherent in complex social relationships beyond mere structural 
connections. This is a significant departure from traditional relational databases, which 
prove inefficient for handling the vast transaction volumes, low-latency access demands, 
and the complex, dynamic, and heterogeneous data characteristic of social networks. Graph 
databases, like Neo4j, are recognized as a compelling solution for natively representing 
individuals as nodes and their diverse ties as edges, storing properties to enrich data with 
roles and specific relationship types.  
Addressing privacy and data protection is paramount for the system, especially within 
the Indian context and the framework of the Digital Personal Data Protection Act, 2023. 
The system will implement robust consent-based mechanisms for data sharing and explore 
privacy-preserving architectures suitable for decentralized Web 3.0 platforms. Ontology
      13 
B.E., Dept of CSE, CITech                                             
2024-25                                                            
India Social Network 
based approaches will be utilized to enhance privacy by identifying potential leaks and 
employing semantic techniques for anonymization while preserving data utility. Key 
provisions of the Indian Act, such as obtaining informed consent, implementing security  
safeguards, and providing user rights, will guide the system's design. The combination of 
these advanced database technologies, an ontological framework, and a strong focus on data 
privacy uniquely positions this platform to effectively address the challenges of building a 
social platform tailored for traditional Indian societal structures. 
3.1  Software Requirements 
The development of the proposed "India Social Network" social platform 
necessitates a clear articulation of software requirements, categorized into Domain, 
Functional, and Non-Functional aspects. These requirements are designed to ensure the 
platform effectively addresses the unique needs of traditional Indian societal structures 
while delivering a robust, scalable, and user-friendly experience. 
3.1.1  Domain Requirements 
• Hierarchical Family Structure: The system must inherently support the 
representation and navigation of hierarchical family structures, acknowledging the 
multi-generational and extended family relationships prevalent in India. 
• Cross-Tree Traceability: The platform should enable tracing connections and 
relationships across different family trees and community groups, reflecting the 
interconnected nature of Indian society beyond individual family units. 
• Cultural Visualization: The visualization module must be capable of presenting social 
data in a culturally sensitive and intuitive manner, particularly for families, clans, and 
communities, aligning with the objectives of the Hypergraph Visualization Module. 
• Consent-Based Data Sharing: Given the emphasis on privacy in the Indian context, 
the system must implement a robust consent-based mechanism for data sharing, 
aligning with the principles of India's Digital Personal Data Protection Act, 2023. 
3.1.2 Functional Requirements 
• User Registration & Login: The platform will provide a secure and straightforward 
2024-25                                                            
      14 
B.E., Dept of CSE, CITech                                             
India Social Network 
• process for user registration and subsequent login.  
• Account Activation: A mechanism for account activation will be in place to verify user 
identities and ensure platform security.    
• One Family Tree per User: Each user will be associated with a single, comprehensive 
family tree, allowing for a centralized representation of their familial connections.  
• Email Notifications: The system will support email notifications for important 
updates, interactions, and activities within the platform. 
3.1.3 Non-Functional Requirements 
• Concurrent Users: The system must be designed to efficiently handle a large number 
of concurrent users, supporting societal-scale applications as intended.  
• Fast Graph Loading: Given the complex and interconnected nature of social data, the 
platform requires fast loading times for social graphs, especially considering the use of 
a combinatorial database module and ontological approach. This directly addresses the 
limitations of traditional relational databases in handling complex and interconnected 
social data efficiently.  
• User-Friendly Interface: The platform must offer an intuitive and user-friendly 
interface to ensure ease of use for a diverse user base across India. 
• Scalable Backend: The backend architecture must be highly scalable to accommodate 
exponential data growth and an increasing user base, leveraging principles from 
NoSQL and distributed graph databases as discussed in the literature survey.  
• Multilingual Support: To cater to the linguistic diversity of India, the platform should 
incorporate multilingual support. 
2024-25                                                             
    15 
B.E., Dept of CSE, CITech                                            
India Social Network 
Chapter 4 
4.1 Architecture 
Design Flow 
Fig 4.1 
• The architecture follows a modular full-stack design, combining a powerful frontend, 
secure backend services, and a graph-based database optimized for Indian family 
relationships. 
1. Frontend (User Side) 
• Built using React.js with Tailwind CSS for design. 
• Shows forms, dashboards, and family trees as graphs (using Cytoscape.js / D3.js). 
• Users can register, log in, create trees, add relationships, and view connections. 
2. Express Backend (Server) 
• Built using Node.js + Express. 
• Receives all requests from the frontend and sends them to the correct service. 
    16 
B.E., Dept of CSE, CITech                                               
2024-25                                                          
India Social Network 
• Uses JWT (JSON Web Token) to keep everything secure. 
3. Authentication & Authorization 
• Checks if a user is logged in. 
• Allows access only if the user is active and has permission. 
• Handles roles like admin, invited, or active user. 
4. Main Backend Services 
• Auth Service – Handles login and token checks. 
• User Service – Stores user details like name, email, status. 
• Graph Service – Manages relationships and tree structures. 
5. Neo4j Graph Database 
• Stores all family members as nodes and relationships as connections. 
• Makes it easy to show graphs and trace family links. 
6. Email Service 
• Sends invitations, temporary passwords, and activation emails to family members. 
7. Real-Time Updates  
• Uses Socket.IO to show live changes when family members are added or changed. 
4.2  Proposed method  
4.2.1  Backend & Security 
• Node.js with JWT authentication 
• Account states: invited and active 
• Relationship validation & tree management 
4.2.2  Three-Phase Workflow 
• Phase 1: Registration & email invites 
2024-25                                                          
    17 
B.E., Dept of CSE, CITech                                               
India Social Network 
• Phase 2: Activation & tree visualization 
• Phase 3: Cross-tree connection &tracing 
4.2.3   Privacy & Scalability 
• Role-based access, compliant with Indian data law 
• Real-time updates with Web Sockets 
• Supports thousands of nodes, admin features 
2024-25                                                          
    18 
B.E., Dept of CSE, CITech                                               
India Social Network 
Chapter 5 
Expected Outcome 
5.1 Functional & Visual Outcomes 
1. Family Tree Web Platform 
• Users can register, create their family tree, and manage members. 
• Only one tree per user to ensure uniqueness. 
2. Graph & Hypergraph Visualizations 
• Interactive Graph View: individual-to-individual relationships. 
• Interactive Hypergraph View: grouped family members and cluster relationships. 
3. Cross-Family Connections 
• Create links between members from different family trees (e.g., marriage). 
• Maintain connection history and traceability across families. 
4. User Authentication with JWT 
• Secure login and session management. 
• Only active users (post-verification) can access tree features. 
5. Private Relationship Definition 
• Each user defines and manages their own relationships. 
• Others cannot view/edit unless explicitly connected. 
6. Email Notification System 
• Invites sent with temporary password and FamilyTreeID. 
• Emails on account activation and relationship updates. 
7. Real-Time Live Updates (Optional but powerful) 
• Socket.IO integration enables: 
▪ Live collaboration 
▪ Instant updates on new members or edits 
5.2  Technical, Social & Cultural Outcomes 
1. Neo4j Graph Database Integration 
• Stores all data as nodes and relationships. 
• Supports complex queries like tracing family paths or multi-generational trees. 
    19 
B.E., Dept of CSE, CITech                                               
2024-25                                                          
India Social Network 
2. Fast and Scalable Backend 
• Uses Express.js for routing and API handling. 
• Scales efficiently for thousands of users and large tree data. 
3. Frontend Built with Modern Tools 
• Uses React.js, Tailwind CSS, Cytoscape.js. 
• Smooth, responsive UI across desktop and mobile. 
4. Compliance with India’s Data Protection Law 
• Ensures secure handling of personal data (DPDP Act, 2023). 
• Features: encrypted storage, consent-based access, private relationships. 
5.3 Cultural & Social Impact Outcomes 
1. Culturally Aligned Relationship Support 
• Handles Indian kinship roles (e.g., Mama, Didi, Chachi, Nana). 
• Supports both nuclear and joint family structures. 
2. Ontology-Based Relationship Integrity 
• Maintains valid family logic (e.g., one mother per child, no circular links). 
• Built using combinatorial and graph-based ontology. 
3. Community & Locality Potential 
• Future scope to group families by location, language, or community. 
• Useful for genealogy, matchmaking, and social events. 
4. Social Preservation 
• Helps preserve ancestral history, relationships, and cultural values. 
• Encourages users to understand and map their roots. 
2024-25                                                              
20 
B.E., Dept of CSE, CITech                                               
India Social Network 
References 
[1] Batra, S., & Tyagi, C. (2012). Comparative Analysis of Relational and Graph 
Databases for Social Network Data. International Journal of Soft Computing and 
Engineering, 2(2), 509–515. ijsce.orgijsce.org 
[2] Besta, M., Gerstenberger, R., Peter, E., Fischer, M., Podstawski, M., Barthels, C., & 
Hoefler, T. (2023). Demystifying Graph Databases: Analysis and Taxonomy of Data 
Organization, System Designs, and Graph Queries. ACM Computing Surveys, 56(2), 
Article 31. research-collection.ethz.ch 
[3] De Moor, A. (2018). Community Network Ontology for Participatory Collaboration 
Mapping: Toward Collective Impact. Information, 9(8), 212. mdpi.commdpi.com 
[4] La Cava, L., Greco, S., & Tagarelli, A. (2021). Understanding the growth of the 
Fediverse through the lens of Mastodon. Applied Network Science, 6(64). 
DOI:10.1007/s41109-021-00392-5. appliednetsci.springeropen.com 
[5] Mika, P. (2005). Ontologies are us: A unified model of social networks and semantics. 
In Proceedings of the 4th International Semantic Web Conference (ISWC) (pp. 522–536). 
scispace.com 
[6] Raj, H., Singh, V. K., & Mitra, K. (2022). Knowledge-based System of Indian Culture 
using Ontology with Customized Named Entity Recognition. Journal of Computer Science 
and Software Programming, 10(4), 172–186. thescipub.com 
[7] Roscam Abbing, R., & Gehl, R. W. (2024). Shifting your research from X to 
Mastodon? Here’s what you need to know. Patterns, 5(1), 100914. 
DOI:10.1016/j.patter.2023.100914 pmc.ncbi.nlm.nih.gov 
[8] Xavier, H. S. (2024). An evidence-based and critical analysis of the Fediverse 
decentralization promises. In WebMedia 2024 – Proceedings of the Brazilian Symposium 
on Multimedia and the Web. arxiv.org 
[9] Chadda, R. K., & Deb, K. S. (2013). Indian family systems, collectivistic society and 
psychotherapy. Indian Journal of Psychiatry, 55(Suppl 2), S299–S309. DOI:10.4103/0019
5545.105555 researchgate.net 
[10]U.S. Patent No. 11,562,442. (2023). Social graph database with compound 
connections (Inventors: C. Smith et al., Assignee: Graphite Systems, Inc.). 
patents.justia.com 
[11] U.S. Patent No. 12,045,283. (2022). Ingestion system for distributed graph database 
(Assignee: IBM Corp.). patents.google.com 
21 
B.E., Dept of CSE, CITech                                               
2024-25                                                              
India Social Network 
Vision 
To become a premier institute transforming our students to be global professionals. 
Mission 
M1: Develop competent Human Resources, and create state-of-the-art infrastructure to 
impart quality education and to support research.    
M2:  Adopt tertiary approach in teaching – learning pedagogy that transforms students to 
become competent  professionals and entrepreneurs.     
M3: Nurture and train students to develop the qualities of global professionals.     
Department Of Computer Science and Engineering 
Vision 
To impart quality education in the field of Computer Science and Engineering with 
emphasis on professional competency to meet the global challenges in IT paradigm.  
Keywords:  Quality education, Professional Competency, Global Challenges 
Mission 
M1: Adopt student-centric approach through experiential learning with necessary 
infrastructure. 
M2: Develop a conducive environment to enhance domain knowledge, communication 
and team participation. 
M3: Enrich students by inculcating the traits of global professionals. 
CAMBRIDGE INSTITUTE OF TECHNOLOGY 
An Autonomous Institution 
K.R. PURAM, BENGALURU – 560 036
 22 
B.E., Dept of CSE, CITech                                               
2024-25                                                              